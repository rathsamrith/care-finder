import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { manageableHospitalWhere } from '../access/hospital-access';
import { resetPasswordMail } from '../mail/mail.templates';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthenticatedUser } from './strategies/jwt-access.strategy';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const RESET_TOKEN_TTL_MINUTES = 10;
// One reset email per address per window, however many IPs ask - stops anyone
// flooding a victim's inbox (the IP rate limit alone cannot).
const RESET_EMAIL_COOLDOWN_MINUTES = 2;

// Only the hash of a reset token is stored, so a leaked DB row can't be used
// to take over an account; the plain token exists only in the emailed link.
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const safeEqualHex = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  // Mirrors AuthController::register - assigns the 'hospital' or 'user'
  // role at signup time. Welcome email sending is left to the module that
  // owns mail (not built in this pass - see MIGRATION_ROADMAP.md).
  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = await this.prisma.role.findFirst({ where: { name: dto.role } });
    if (!role) {
      throw new BadRequestException(`Role "${dto.role}" is not seeded`);
    }

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        name: `${dto.firstName} ${dto.lastName}`,
        email: dto.email,
        password: passwordHash,
        phone: dto.phone,
        roles: { create: { roleId: role.id } },
      },
    });

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user.id, user.email);
  }

  // Stateless JWT access tokens can't be server-side revoked without an
  // extra denylist store. Left as a client-side no-op for this pass; add a
  // Redis/DB denylist here if immediate revocation becomes a requirement.
  async logout(): Promise<{ message: string }> {
    return { message: 'Logged out' };
  }

  async refresh(payload: { sub: string; email: string }): Promise<TokenPair> {
    return this.issueTokens(BigInt(payload.sub), payload.email);
  }

  async me(user: AuthenticatedUser) {
    const [record, hospitals] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { doctor: true } }),
      this.prisma.hospital.findMany({ where: manageableHospitalWhere(user.id), orderBy: { id: 'asc' } }),
    ]);
    // `hospital` stays the single "current" hospital every existing screen
    // reads; `hospitals` feeds the branch switcher.
    const active = hospitals.find((h) => h.id === user.activeHospitalId) ?? hospitals[0] ?? null;

    return {
      ...this.serializeUser(record),
      hospital: active,
      hospitals: hospitals.map((h) => ({ id: h.id, name: h.name, slug: h.slug, province: h.province })),
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  async updateProfile(userId: bigint, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        name:
          dto.firstName || dto.lastName
            ? `${dto.firstName ?? ''} ${dto.lastName ?? ''}`.trim()
            : undefined,
      },
    });

    return this.serializeUser(user);
  }

  async updateProfileImage(userId: bigint, profilePath: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profile: profilePath },
    });

    return this.serializeUser(user);
  }

  // Custom password_resets token flow, kept from the Laravel app instead of
  // switching to Laravel's built-in Password broker (which the app never
  // used) or a Nest-native equivalent.
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      // Do not leak whether the email exists.
      return { message: 'If that email exists, a reset link has been sent' };
    }

    // `expiresAt - TTL` is when the current token was issued.
    const existing = await this.prisma.passwordReset.findUnique({ where: { email: dto.email } });
    if (existing) {
      const issuedAt = existing.expiresAt.getTime() - RESET_TOKEN_TTL_MINUTES * 60 * 1000;
      if (Date.now() - issuedAt < RESET_EMAIL_COOLDOWN_MINUTES * 60 * 1000) {
        return { message: 'If that email exists, a reset link has been sent' };
      }
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await this.prisma.passwordReset.upsert({
      where: { email: dto.email },
      create: { email: dto.email, token: hashToken(token), expiresAt },
      update: { token: hashToken(token), expiresAt },
    });

    const appUrl = (process.env.APP_URL ?? process.env.CORS_ORIGIN?.split(',')[0] ?? 'http://localhost:5173').replace(/\/$/, '');
    const link = `${appUrl}/reset-password?t=${token}&e=${encodeURIComponent(dto.email)}`;
    const name = user.firstName || user.name || 'there';
    // Fire and forget: response time must not reveal whether the email exists.
    void this.mail.send(dto.email, resetPasswordMail(name, link, RESET_TOKEN_TTL_MINUTES));

    return { message: 'If that email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const reset = await this.prisma.passwordReset.findUnique({ where: { email: dto.email } });
    if (!reset || !safeEqualHex(reset.token, hashToken(dto.token)) || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: dto.email },
        data: { password: passwordHash },
      }),
      this.prisma.passwordReset.delete({ where: { email: dto.email } }),
    ]);

    return { message: 'Password has been reset' };
  }

  private async issueTokens(userId: bigint, email: string): Promise<TokenPair> {
    const payload = { sub: userId.toString(), email };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_TTL ?? '30d',
    });

    return { accessToken, refreshToken };
  }

  // Strips the password hash before a user record goes into any response.
  // BigInt id/FK serialization is handled globally by BigIntInterceptor.
  private serializeUser<T extends { password?: string }>(user: T): Omit<T, 'password'> {
    const { password: _password, ...rest } = user;
    return rest;
  }
}
