import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../../prisma/prisma.service';
import { manageableHospitalWhere } from '../../access/hospital-access';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedUser {
  id: bigint;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  permissions: string[];
  // The hospital this request acts on behalf of (hospital-role users only):
  // the one named by a valid `X-Hospital-Id` header, else their first.
  activeHospitalId?: bigint;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: FastifyRequest, payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
      include: {
        roles: { include: { role: true } },
        permissions: { include: { permission: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const roles = user.roles.map((r) => r.role.name);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions: user.permissions.map((p) => p.permission.name),
      activeHospitalId: roles.includes('hospital') ? await this.resolveActiveHospital(user.id, req) : undefined,
    };
  }

  // A client-supplied id is only honored if the user really manages that
  // hospital; anything else (missing, malformed, someone else's) silently
  // falls back to their first hospital.
  private async resolveActiveHospital(userId: bigint, req: FastifyRequest): Promise<bigint | undefined> {
    const header = req.headers?.['x-hospital-id'];
    const requested = typeof header === 'string' && /^\d{1,18}$/.test(header) ? BigInt(header) : undefined;

    if (requested !== undefined) {
      const match = await this.prisma.hospital.findFirst({
        where: { id: requested, ...manageableHospitalWhere(userId) },
        select: { id: true },
      });
      if (match) return match.id;
    }
    const first = await this.prisma.hospital.findFirst({
      where: manageableHospitalWhere(userId),
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    return first?.id;
  }
}
