import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/strategies/jwt-access.strategy';
import { ORG_ROLE_RANK, OrgRole, manageableHospitalWhere, rolesAtLeast } from './hospital-access';

// The one place that decides "may this user manage this hospital". Replaces the
// per-service `hospital.userId !== user.id` checks, so supporting organizations
// with several hospitals and members means changing this class only.
@Injectable()
export class HospitalAccessService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdmin(user: AuthenticatedUser) {
    return user.roles.includes('admin');
  }

  // Belongs to the hospital (creator, or organization member with >= `min`),
  // ignoring the platform admin role. Used where admins must NOT bypass the
  // rule, e.g. "you cannot review your own hospital".
  async isMember(
    hospital: { userId: bigint; organizationId: bigint | null },
    userId: bigint,
    min: OrgRole = 'Manager',
  ): Promise<boolean> {
    if (hospital.userId === userId) return true;
    if (!hospital.organizationId) return false;
    const membership = await this.prisma.organizationMember.count({
      where: { organizationId: hospital.organizationId, userId, role: { in: rolesAtLeast(min) } },
    });
    return membership > 0;
  }

  async canManage(hospitalId: bigint, user: AuthenticatedUser, min: OrgRole = 'Manager'): Promise<boolean> {
    if (this.isAdmin(user)) return true;
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
      select: { userId: true, organizationId: true },
    });
    return hospital ? this.isMember(hospital, user.id, min) : false;
  }

  // Loads the hospital and throws 404 / 403; returns the hospital on success.
  async assertCanManage(hospitalId: bigint, user: AuthenticatedUser, min: OrgRole = 'Manager') {
    const hospital = await this.prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }
    if (!this.isAdmin(user) && !(await this.isMember(hospital, user.id, min))) {
      throw new ForbiddenException('You do not own this hospital');
    }
    return hospital;
  }

  // The user's role inside an organization, or null. Platform admins count as
  // Owner; a hospital's creator counts as Owner even without a membership row.
  async orgRole(orgId: bigint, user: AuthenticatedUser): Promise<OrgRole | null> {
    if (this.isAdmin(user)) return 'Owner';
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
      select: { role: true },
    });
    if (membership) return membership.role;
    const created = await this.prisma.hospital.count({ where: { organizationId: orgId, userId: user.id } });
    return created > 0 ? 'Owner' : null;
  }

  async assertOrgRole(orgId: bigint, user: AuthenticatedUser, min: OrgRole = 'Manager'): Promise<OrgRole> {
    const role = await this.orgRole(orgId, user);
    if (!role) throw new ForbiddenException('You are not a member of this organization');
    if (ORG_ROLE_RANK[role] < ORG_ROLE_RANK[min]) {
      throw new ForbiddenException(`This requires the ${min} role or higher`);
    }
    return role;
  }

  // The hospital a "my hospital" route acts on: the one selected with the
  // X-Hospital-Id header (resolved and verified in JwtAccessStrategy), else
  // the caller's first manageable hospital.
  activeHospital(user: AuthenticatedUser) {
    if (user.activeHospitalId !== undefined) {
      return this.prisma.hospital.findUnique({ where: { id: user.activeHospitalId } });
    }
    return this.prisma.hospital.findFirst({
      where: manageableHospitalWhere(user.id),
      orderBy: { id: 'asc' },
    });
  }

  async manageableHospitalIds(user: AuthenticatedUser): Promise<bigint[]> {
    const rows = await this.prisma.hospital.findMany({
      where: manageableHospitalWhere(user.id),
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  // Who gets notified about a hospital's appointments/cancellations: the
  // creator plus organization Owners and Admins.
  async notificationRecipientIds(hospital: { userId: bigint; organizationId: bigint | null }): Promise<bigint[]> {
    const ids = new Set<string>([hospital.userId.toString()]);
    if (hospital.organizationId) {
      const members = await this.prisma.organizationMember.findMany({
        where: { organizationId: hospital.organizationId, role: { in: rolesAtLeast('Admin') } },
        select: { userId: true },
      });
      members.forEach((m) => ids.add(m.userId.toString()));
    }
    return [...ids].map((id) => BigInt(id));
  }
}
