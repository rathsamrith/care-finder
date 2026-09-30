import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HospitalAccessService } from './hospital-access.service';
import { manageableHospitalWhere, rolesAtLeast } from './hospital-access';

const user = (id: bigint, roles: string[] = ['hospital']) => ({ id, roles, email: 'x@y.z', firstName: null, lastName: null, permissions: [] }) as any;

// Fake prisma: hospitals keyed by id, organization members as plain rows.
function setup(
  hospitals: { id: bigint; userId: bigint; organizationId: bigint | null }[],
  members: { organizationId: bigint; userId: bigint; role: 'Owner' | 'Admin' | 'Manager' }[] = [],
) {
  const prisma: any = {
    hospital: {
      findUnique: jest.fn(async ({ where }: any) => hospitals.find((h) => h.id === where.id) ?? null),
    },
    organizationMember: {
      count: jest.fn(async ({ where }: any) =>
        members.filter(
          (m) => m.organizationId === where.organizationId && m.userId === where.userId && where.role.in.includes(m.role),
        ).length,
      ),
      findMany: jest.fn(async ({ where }: any) =>
        members.filter((m) => m.organizationId === where.organizationId && where.role.in.includes(m.role)),
      ),
    },
  };
  return new HospitalAccessService(prisma);
}

const H1 = { id: 1n, userId: 10n, organizationId: 100n };

describe('role helpers', () => {
  it('orders roles and builds the membership filter', () => {
    expect(rolesAtLeast('Manager')).toEqual(['Manager', 'Admin', 'Owner']);
    expect(rolesAtLeast('Admin')).toEqual(['Admin', 'Owner']);
    expect(rolesAtLeast('Owner')).toEqual(['Owner']);
    const where = manageableHospitalWhere(5n, 'Admin') as any;
    expect(where.OR[0]).toEqual({ userId: 5n });
    expect(where.OR[1].organization.members.some).toEqual({ userId: 5n, role: { in: ['Admin', 'Owner'] } });
  });
});

describe('HospitalAccessService', () => {
  it('the hospital creator always manages it, even without a membership row (legacy hospitals)', async () => {
    const access = setup([{ ...H1, organizationId: null }]);
    expect(await access.canManage(1n, user(10n))).toBe(true);
    expect(await access.canManage(1n, user(11n))).toBe(false);
  });

  it('organization members manage every hospital of the organization, by minimum role', async () => {
    const access = setup([H1], [{ organizationId: 100n, userId: 20n, role: 'Manager' }]);
    expect(await access.canManage(1n, user(20n))).toBe(true);
    expect(await access.canManage(1n, user(20n), 'Admin')).toBe(false);
    expect(await access.canManage(1n, user(99n))).toBe(false);
  });

  it('members of a different organization get nothing', async () => {
    const access = setup([H1], [{ organizationId: 999n, userId: 20n, role: 'Owner' }]);
    expect(await access.canManage(1n, user(20n))).toBe(false);
  });

  it('platform admins manage everything, but are not "members" (cannot review their own)', async () => {
    const access = setup([H1]);
    expect(await access.canManage(1n, user(77n, ['admin']))).toBe(true);
    expect(await access.isMember(H1, 77n)).toBe(false);
    expect(await access.isMember(H1, 10n)).toBe(true);
  });

  it('assertCanManage: 404 for unknown hospitals, 403 for outsiders, hospital for managers', async () => {
    const access = setup([H1]);
    await expect(access.assertCanManage(2n, user(10n))).rejects.toBeInstanceOf(NotFoundException);
    await expect(access.assertCanManage(1n, user(11n))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(access.assertCanManage(1n, user(11n))).rejects.toThrow('You do not own this hospital');
    await expect(access.assertCanManage(1n, user(10n))).resolves.toMatchObject({ id: 1n });
  });

  it('notification recipients: creator plus organization Owners and Admins, deduplicated, never Managers', async () => {
    const access = setup(
      [H1],
      [
        { organizationId: 100n, userId: 10n, role: 'Owner' }, // same as creator
        { organizationId: 100n, userId: 20n, role: 'Admin' },
        { organizationId: 100n, userId: 30n, role: 'Manager' },
      ],
    );
    const ids = (await access.notificationRecipientIds(H1)).map(String).sort();
    expect(ids).toEqual(['10', '20']);
  });
});
