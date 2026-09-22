import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { ORG_ROLE_RANK, OrgRole } from '../../core/access/hospital-access';
import { MailService } from '../../core/mail/mail.service';
import { organizationInviteMail } from '../../core/mail/mail.templates';

const INVITE_VALID_DAYS = 7;
const MAX_PENDING_INVITES = 20;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
    private readonly mail: MailService,
  ) {}

  // The organization of the caller's active hospital, with its people.
  // Invites are only shown to Admins and Owners.
  async mine(user: AuthenticatedUser) {
    const hospital = await this.access.activeHospital(user);
    if (!hospital?.organizationId) throw new NotFoundException('You do not have a hospital');
    const orgId = hospital.organizationId;
    const myRole = await this.access.assertOrgRole(orgId, user, 'Manager');

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      include: {
        hospitals: { select: { id: true, name: true }, orderBy: { id: 'asc' } },
        members: {
          orderBy: { id: 'asc' },
          include: { user: { select: { id: true, firstName: true, lastName: true, name: true, email: true } } },
        },
      },
    });
    const canSeeInvites = ORG_ROLE_RANK[myRole] >= ORG_ROLE_RANK.Admin;
    const invites = canSeeInvites
      ? await this.prisma.organizationInvite.findMany({
          where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { id: 'desc' },
          select: { id: true, email: true, role: true, expiresAt: true },
        })
      : [];

    return {
      id: org.id,
      name: org.name,
      myRole,
      hospitals: org.hospitals,
      members: org.members.map((m) => ({
        userId: m.userId,
        name: m.user.name || `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim(),
        email: m.user.email,
        role: m.role,
      })),
      invites,
    };
  }

  async invite(user: AuthenticatedUser, orgId: bigint, dto: { email: string; role: 'Admin' | 'Manager' }) {
    const actorRole = await this.access.assertOrgRole(orgId, user, 'Admin');
    if (dto.role === 'Admin' && actorRole !== 'Owner') {
      throw new ForbiddenException('Only an Owner can invite an Admin');
    }

    const email = normalizeEmail(dto.email);
    const existingMember = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, user: { email } },
    });
    if (existingMember) throw new ConflictException('This person is already a member');

    const now = new Date();
    const pending = await this.prisma.organizationInvite.count({
      where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: now } },
    });
    if (pending >= MAX_PENDING_INVITES) {
      throw new ConflictException(`You can have at most ${MAX_PENDING_INVITES} pending invitations`);
    }

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(now.getTime() + INVITE_VALID_DAYS * 86_400_000);

    // One live invitation per email: re-inviting replaces (resends) the old one.
    const [, invite] = await this.prisma.$transaction([
      this.prisma.organizationInvite.deleteMany({ where: { organizationId: orgId, email, acceptedAt: null } }),
      this.prisma.organizationInvite.create({
        data: {
          organizationId: orgId,
          email,
          role: dto.role as OrganizationRole,
          tokenHash: hashToken(token),
          invitedById: user.id,
          expiresAt,
        },
        select: { id: true, email: true, role: true, expiresAt: true },
      }),
    ]);

    const appUrl = (process.env.APP_URL ?? process.env.CORS_ORIGIN?.split(',')[0] ?? 'http://localhost:5173').replace(/\/$/, '');
    const acceptUrl = `${appUrl}/accept-invite?t=${token}&e=${encodeURIComponent(email)}`;
    const inviterName = user.firstName || 'A teammate';
    const sent = await this.mail.send(
      email,
      organizationInviteMail({ inviterName, organizationName: org.name, role: dto.role, url: acceptUrl, validDays: INVITE_VALID_DAYS }),
    );

    // If the email could not be sent (no mail server, or it is down) the
    // inviter would have no way to deliver the link, so hand it back - only then.
    return { ...invite, emailSent: sent, ...(sent ? {} : { acceptUrl }) };
  }

  async revokeInvite(user: AuthenticatedUser, orgId: bigint, inviteId: bigint) {
    await this.access.assertOrgRole(orgId, user, 'Admin');
    const result = await this.prisma.organizationInvite.deleteMany({
      where: { id: inviteId, organizationId: orgId, acceptedAt: null },
    });
    if (result.count === 0) throw new NotFoundException('Invitation not found');
    return { message: 'Invitation revoked' };
  }

  // Accepting needs a signed-in hospital account whose email matches the invite.
  // The 'hospital' role is deliberately NOT granted here: mixing it into a
  // patient account would change what the rest of the app shows that person.
  async accept(user: AuthenticatedUser, token: string) {
    const invite = await this.prisma.organizationInvite.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('This invitation is invalid or has expired');
    }
    if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }
    if (!user.roles.includes('hospital')) {
      throw new ForbiddenException('Sign up with a hospital account using this email address to accept');
    }

    await this.prisma.$transaction([
      this.prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: invite.organizationId, userId: user.id } },
        create: { organizationId: invite.organizationId, userId: user.id, role: invite.role },
        update: {}, // already a member: never change their role through an invite
      }),
      this.prisma.organizationInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
    ]);
    return { organizationId: invite.organizationId, name: invite.organization.name, role: invite.role };
  }

  async changeRole(user: AuthenticatedUser, orgId: bigint, targetUserId: bigint, role: OrgRole) {
    await this.access.assertOrgRole(orgId, user, 'Owner');
    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');

    if (target.role === 'Owner' && role !== 'Owner') {
      await this.assertNotLastOwner(orgId, targetUserId);
    }
    await this.prisma.organizationMember.update({ where: { id: target.id }, data: { role: role as OrganizationRole } });
    return { message: 'Role updated' };
  }

  // Owners can remove anyone (but never the last Owner); Admins can remove
  // Managers; anyone may leave. Hospitals the removed person created are handed
  // to an Owner, because a hospital's creator keeps access through Hospital.userId.
  async removeMember(user: AuthenticatedUser, orgId: bigint, targetUserId: bigint) {
    const actorRole = await this.access.assertOrgRole(orgId, user, 'Manager');
    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');

    const isSelf = targetUserId === user.id;
    const allowed =
      isSelf ||
      actorRole === 'Owner' ||
      (actorRole === 'Admin' && target.role === 'Manager');
    if (!allowed) throw new ForbiddenException('You are not allowed to remove this member');

    if (target.role === 'Owner') await this.assertNotLastOwner(orgId, targetUserId);

    const newOwnerId = await this.pickOwnerExcluding(orgId, targetUserId, user.id);
    await this.prisma.$transaction([
      this.prisma.hospital.updateMany({
        where: { organizationId: orgId, userId: targetUserId },
        data: { userId: newOwnerId },
      }),
      this.prisma.organizationMember.delete({ where: { id: target.id } }),
    ]);
    return { message: 'Member removed' };
  }

  private async assertNotLastOwner(orgId: bigint, userId: bigint) {
    const others = await this.prisma.organizationMember.count({
      where: { organizationId: orgId, role: 'Owner', userId: { not: userId } },
    });
    if (others === 0) throw new ConflictException('An organization must keep at least one Owner');
  }

  // Who inherits hospitals created by a departing member: the acting Owner if
  // that is someone else, otherwise the first other Owner.
  private async pickOwnerExcluding(orgId: bigint, excludedUserId: bigint, actorId: bigint): Promise<bigint> {
    const owners = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId, role: 'Owner', userId: { not: excludedUserId } },
      orderBy: { id: 'asc' },
      select: { userId: true },
    });
    const ids = owners.map((o) => o.userId);
    if (ids.includes(actorId)) return actorId;
    // Managers/Admins removing a Manager never create hospitals, so there is
    // nothing to hand over; fall back to the target to keep the update a no-op.
    return ids[0] ?? excludedUserId;
  }
}
