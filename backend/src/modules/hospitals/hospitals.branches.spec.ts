import { ConflictException } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { JwtAccessStrategy } from '../../core/auth/strategies/jwt-access.strategy';
import { HospitalAccessService } from '../../core/access/hospital-access.service';

const dto = { name: 'Branch B', categoryId: 1 } as any;

function setupCreate(existingMembership: any) {
  const create = jest.fn().mockResolvedValue({ id: 50n });
  const prisma: any = {
    category: { findUnique: jest.fn().mockResolvedValue({ id: 1n }) },
    organizationMember: { findFirst: jest.fn().mockResolvedValue(existingMembership) },
    hospital: { create },
  };
  return { service: new HospitalsService(prisma, {} as any, {} as any), create };
}

describe('HospitalsService.create (organizations)', () => {
  afterEach(() => {
    delete process.env.MAX_HOSPITALS_PER_ORG;
  });

  it("a user's first hospital creates a new organization with them as Owner", async () => {
    const { service, create } = setupCreate(null);
    await service.create(7n, dto);
    const data = create.mock.calls[0][0].data;
    expect(data.organization.create.members.create).toEqual({ userId: 7n, role: 'Owner' });
    expect(data.organization.connect).toBeUndefined();
    expect(data.owner).toEqual({ connect: { id: 7n } });
  });

  it('later hospitals become branches of the organization the user owns/administers', async () => {
    const membership = { organizationId: 100n, organization: { _count: { hospitals: 1 } } };
    const { service, create } = setupCreate(membership);
    await service.create(7n, dto);
    const data = create.mock.calls[0][0].data;
    expect(data.organization).toEqual({ connect: { id: 100n } });
  });

  it('only Owner/Admin memberships qualify (Managers cannot add hospitals)', async () => {
    const { service } = setupCreate(null);
    await service.create(7n, dto);
    const prisma: any = (service as any).prisma;
    expect(prisma.organizationMember.findFirst.mock.calls[0][0].where.role).toEqual({ in: ['Owner', 'Admin'] });
  });

  it('enforces the per-organization hospital cap (default 5, MAX_HOSPITALS_PER_ORG overrides)', async () => {
    const full = { organizationId: 100n, organization: { _count: { hospitals: 5 } } };
    await expect(setupCreate(full).service.create(7n, dto)).rejects.toBeInstanceOf(ConflictException);

    process.env.MAX_HOSPITALS_PER_ORG = '6';
    const { service, create } = setupCreate(full);
    await service.create(7n, dto);
    expect(create).toHaveBeenCalled();
  });
});

describe('active hospital', () => {
  const user = (over: object = {}) => ({ id: 7n, roles: ['hospital'], ...over }) as any;

  it('HospitalAccessService.activeHospital uses the selected id, else the first manageable', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 9n });
    const findFirst = jest.fn().mockResolvedValue({ id: 1n });
    const access = new HospitalAccessService({ hospital: { findUnique, findFirst } } as any);

    await access.activeHospital(user({ activeHospitalId: 9n }));
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 9n } });

    await access.activeHospital(user());
    expect(findFirst.mock.calls[0][0].orderBy).toEqual({ id: 'asc' });
  });

  function strategy(manageable: Record<string, boolean>, roles = ['hospital']) {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7n, email: 'a@b.c', firstName: null, lastName: null,
          roles: roles.map((name) => ({ role: { name } })), permissions: [],
        }),
      },
      hospital: {
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.id !== undefined) return manageable[String(where.id)] ? { id: where.id } : null;
          return { id: 1n }; // first manageable
        }),
      },
    };
    process.env.JWT_ACCESS_SECRET = 'test';
    return new JwtAccessStrategy(prisma);
  }
  const reqWith = (header?: string) => ({ headers: header === undefined ? {} : { 'x-hospital-id': header } }) as any;
  const payload = { sub: '7', email: 'a@b.c' };

  it('honors X-Hospital-Id only for hospitals the user manages', async () => {
    const s = strategy({ '2': true });
    expect((await s.validate(reqWith('2'), payload)).activeHospitalId).toBe(2n);
    expect((await s.validate(reqWith('3'), payload)).activeHospitalId).toBe(1n); // not theirs -> first
  });

  it('ignores malformed headers and falls back to the first hospital', async () => {
    const s = strategy({ '2': true });
    for (const bad of ['abc', '1; DROP TABLE', '', '99999999999999999999999']) {
      expect((await s.validate(reqWith(bad), payload)).activeHospitalId).toBe(1n);
    }
    expect((await s.validate(reqWith(), payload)).activeHospitalId).toBe(1n);
  });

  it('non-hospital accounts never get an active hospital', async () => {
    const s = strategy({ '2': true }, ['user']);
    expect((await s.validate(reqWith('2'), payload)).activeHospitalId).toBeUndefined();
  });
});

describe('HospitalsService.remove', () => {
  function setupRemove(remaining: number) {
    const tx: any = {
      hospital: { delete: jest.fn(), count: jest.fn().mockResolvedValue(remaining) },
      organization: { deleteMany: jest.fn() },
    };
    const prisma: any = { $transaction: jest.fn(async (fn: any) => fn(tx)) };
    const access: any = { assertCanManage: jest.fn().mockResolvedValue({ id: 5n, organizationId: 100n }) };
    return { service: new HospitalsService(prisma, access, {} as any), tx, access };
  }

  it('requires the Owner role (irreversible action)', async () => {
    const { service, access } = setupRemove(1);
    await service.remove(5n, { id: 1n, roles: ['hospital'] } as any);
    expect(access.assertCanManage).toHaveBeenCalledWith(5n, expect.anything(), 'Owner');
  });

  it("also deletes the organization when that was its last hospital", async () => {
    const { service, tx } = setupRemove(0);
    await service.remove(5n, { id: 1n, roles: ['hospital'] } as any);
    expect(tx.hospital.delete).toHaveBeenCalledWith({ where: { id: 5n } });
    expect(tx.organization.deleteMany).toHaveBeenCalledWith({ where: { id: 100n } });
  });

  it('keeps the organization while it still has other hospitals', async () => {
    const { service, tx } = setupRemove(2);
    await service.remove(5n, { id: 1n, roles: ['hospital'] } as any);
    expect(tx.organization.deleteMany).not.toHaveBeenCalled();
  });
});
