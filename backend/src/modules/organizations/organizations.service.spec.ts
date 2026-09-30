import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { OrganizationsService } from './organizations.service';

type Role = 'Owner' | 'Admin' | 'Manager';
const ORG = 1n;

// In-memory stand-in for the handful of Prisma calls the service makes.
function setup(opts: { members: [bigint, Role][]; hospitals?: { id: bigint; userId: bigint }[]; emails?: Record<string, string> }) {
  const users: Record<string, string> = { '1': 'owner@x.com', '2': 'admin@x.com', '3': 'mgr@x.com', '4': 'new@x.com', ...opts.emails };
  let nextId = 100n;
  const members = opts.members.map(([userId, role], i) => ({ id: BigInt(i + 1), organizationId: ORG, userId, role }));
  const hospitals = (opts.hospitals ?? [{ id: 10n, userId: 1n }]).map((h) => ({ ...h, organizationId: ORG }));
  const invites: any[] = [];
  const emailOf = (id: bigint) => users[String(id)];

  const prisma: any = {
    organization: {
      findUniqueOrThrow: async () => ({
        id: ORG, name: 'Sunrise Group',
        hospitals: hospitals.map((h) => ({ id: h.id, name: `H${h.id}` })),
        members: members.map((m) => ({ ...m, user: { id: m.userId, firstName: 'F', lastName: 'L', name: null, email: emailOf(m.userId) } })),
      }),
    },
    organizationMember: {
      findUnique: async ({ where }: any) => {
        const k = where.organizationId_userId;
        return members.find((m) => m.organizationId === k.organizationId && m.userId === k.userId) ?? null;
      },
      findFirst: async ({ where }: any) => members.find((m) => emailOf(m.userId) === where.user.email) ?? null,
      count: async ({ where }: any) =>
        members.filter((m) => m.role === where.role && (!where.userId?.not || m.userId !== where.userId.not)).length,
      findMany: async ({ where }: any) =>
        members.filter((m) => m.role === where.role && m.userId !== where.userId.not).map((m) => ({ userId: m.userId })),
      upsert: async ({ where, create }: any) => {
        const k = where.organizationId_userId;
        const hit = members.find((m) => m.organizationId === k.organizationId && m.userId === k.userId);
        if (hit) return hit;
        const row = { id: nextId++, ...create };
        members.push(row);
        return row;
      },
      update: async ({ where, data }: any) => Object.assign(members.find((m) => m.id === where.id)!, data),
      delete: async ({ where }: any) => members.splice(members.findIndex((m) => m.id === where.id), 1),
    },
    organizationInvite: {
      count: async () => invites.filter((i) => !i.acceptedAt && i.expiresAt > new Date()).length,
      deleteMany: async ({ where }: any) => {
        const before = invites.length;
        for (let i = invites.length - 1; i >= 0; i--) {
          const v = invites[i];
          const match = (where.id === undefined || v.id === where.id) && (where.email === undefined || v.email === where.email) && !v.acceptedAt;
          if (match) invites.splice(i, 1);
        }
        return { count: before - invites.length };
      },
      create: async ({ data }: any) => {
        const row = { id: nextId++, acceptedAt: null, ...data };
        invites.push(row);
        return { id: row.id, email: row.email, role: row.role, expiresAt: row.expiresAt };
      },
      findUnique: async ({ where }: any) => {
        const inv = invites.find((i) => i.tokenHash === where.tokenHash);
        return inv ? { ...inv, organization: { id: ORG, name: 'Sunrise Group' } } : null;
      },
      update: async ({ where, data }: any) => Object.assign(invites.find((i) => i.id === where.id)!, data),
      findMany: async () => invites.filter((i) => !i.acceptedAt),
    },
    hospital: {
      count: async ({ where }: any) => hospitals.filter((h) => h.userId === where.userId).length,
      updateMany: async ({ where, data }: any) => {
        hospitals.filter((h) => h.userId === where.userId).forEach((h) => (h.userId = data.userId));
        return { count: 1 };
      },
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const access = new HospitalAccessService(prisma);
  jest.spyOn(access, 'activeHospital').mockResolvedValue({ id: 10n, organizationId: ORG, userId: 1n } as any);
  const mail: any = { send: jest.fn().mockResolvedValue(true) };
  const service = new OrganizationsService(prisma, access, mail);
  return { service, members, invites, hospitals, mail };
}

const as = (id: bigint, over: object = {}) => ({ id, email: `u${id}@x.com`, roles: ['hospital'], firstName: 'Sam', ...over }) as any;
const tokenFromMail = (mail: any) => /t=([a-f0-9]{64})/.exec(mail.send.mock.calls.at(-1)[1].text)![1];
const OWNER = as(1n, { email: 'owner@x.com' });
const ADMIN = as(2n, { email: 'admin@x.com' });
const MGR = as(3n, { email: 'mgr@x.com' });
const team = { members: [[1n, 'Owner'], [2n, 'Admin'], [3n, 'Manager']] as [bigint, Role][] };

describe('inviting', () => {
  afterEach(() => delete process.env.MAIL_HOST);

  it('Managers cannot invite; Admins can invite Managers only; Owners can invite Admins', async () => {
    const { service } = setup(team);
    await expect(service.invite(MGR, ORG, { email: 'a@b.c', role: 'Manager' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.invite(ADMIN, ORG, { email: 'a@b.c', role: 'Admin' })).rejects.toThrow('Only an Owner');
    await expect(service.invite(ADMIN, ORG, { email: 'a@b.c', role: 'Manager' })).resolves.toBeDefined();
    await expect(service.invite(OWNER, ORG, { email: 'd@e.f', role: 'Admin' })).resolves.toBeDefined();
  });

  it('stores only a hash of the token; the token exists only in the emailed link', async () => {
    const { service, invites, mail } = setup(team);
    await service.invite(OWNER, ORG, { email: '  New@X.com ', role: 'Manager' });
    const token = tokenFromMail(mail);
    expect(invites[0].email).toBe('new@x.com');
    expect(invites[0].tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(Object.values(invites[0]).map(String)).not.toContain(token);
    expect(mail.send.mock.calls[0][0]).toBe('new@x.com');
  });

  it('returns the link only when the email could not be sent', async () => {
    const failed = setup(team);
    failed.mail.send.mockResolvedValue(false);
    const dev = await failed.service.invite(OWNER, ORG, { email: 'a@b.c', role: 'Manager' });
    expect((dev as any).emailSent).toBe(false);
    expect((dev as any).acceptUrl).toMatch(/accept-invite\?t=/);

    const ok = await setup(team).service.invite(OWNER, ORG, { email: 'a@b.c', role: 'Manager' });
    expect((ok as any).emailSent).toBe(true);
    expect((ok as any).acceptUrl).toBeUndefined();
  });

  it('rejects existing members, replaces a repeat invite, and caps pending invites', async () => {
    const { service, invites } = setup(team);
    await expect(service.invite(OWNER, ORG, { email: 'admin@x.com', role: 'Manager' })).rejects.toBeInstanceOf(ConflictException);
    await service.invite(OWNER, ORG, { email: 'a@b.c', role: 'Manager' });
    await service.invite(OWNER, ORG, { email: 'a@b.c', role: 'Admin' });
    expect(invites).toHaveLength(1);
    expect(invites[0].role).toBe('Admin');
    for (let i = 0; i < 19; i++) await service.invite(OWNER, ORG, { email: `p${i}@b.c`, role: 'Manager' });
    await expect(service.invite(OWNER, ORG, { email: 'one-more@b.c', role: 'Manager' })).rejects.toThrow(/at most 20/);
  });
});

describe('accepting', () => {
  async function invited(email = 'new@x.com', role: 'Admin' | 'Manager' = 'Manager') {
    const ctx = setup(team);
    await ctx.service.invite(OWNER, ORG, { email, role });
    return { ...ctx, token: tokenFromMail(ctx.mail) };
  }

  it('adds the member with the invited role and consumes the invite', async () => {
    const { service, members, invites, token } = await invited('new@x.com', 'Admin');
    await service.accept(as(4n, { email: 'NEW@x.com' }), token);
    expect(members.find((m) => m.userId === 4n)?.role).toBe('Admin');
    expect(invites[0].acceptedAt).toBeInstanceOf(Date);
    await expect(service.accept(as(4n, { email: 'new@x.com' }), token)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses another email address, non-hospital accounts, unknown and expired tokens', async () => {
    const { service, invites, token } = await invited();
    await expect(service.accept(as(9n, { email: 'other@x.com' }), token)).rejects.toThrow('different email');
    await expect(service.accept(as(4n, { email: 'new@x.com', roles: ['user'] }), token)).rejects.toThrow('hospital account');
    await expect(service.accept(as(4n, { email: 'new@x.com' }), 'f'.repeat(64))).rejects.toBeInstanceOf(BadRequestException);
    invites[0].expiresAt = new Date(Date.now() - 1000);
    await expect(service.accept(as(4n, { email: 'new@x.com' }), token)).rejects.toThrow(/expired/);
  });

  it('never changes the role of someone who is already a member', async () => {
    const ctx = setup({ ...team, emails: { '3': 'mgr@x.com' } });
    await ctx.service.invite(OWNER, ORG, { email: 'newmgr@x.com', role: 'Admin' });
    const token = tokenFromMail(ctx.mail);
    ctx.members.push({ id: 50n, organizationId: ORG, userId: 7n, role: 'Manager' });
    await ctx.service.accept(as(7n, { email: 'newmgr@x.com' }), token);
    expect(ctx.members.find((m) => m.userId === 7n)?.role).toBe('Manager');
  });
});

describe('roles and removal', () => {
  it('only Owners change roles, and the last Owner cannot be demoted', async () => {
    const { service } = setup(team);
    await expect(service.changeRole(ADMIN, ORG, 3n, 'Admin')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.changeRole(OWNER, ORG, 1n, 'Admin')).rejects.toThrow('at least one Owner');
    await expect(service.changeRole(OWNER, ORG, 3n, 'Admin')).resolves.toBeDefined();
    await expect(service.changeRole(OWNER, ORG, 99n, 'Admin')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('Admins remove Managers only; Managers cannot remove others; anyone can leave', async () => {
    const { service, members } = setup(team);
    await expect(service.removeMember(ADMIN, ORG, 1n)).rejects.toBeInstanceOf(ForbiddenException); // the Owner
    await expect(service.removeMember(MGR, ORG, 2n)).rejects.toBeInstanceOf(ForbiddenException);
    await service.removeMember(ADMIN, ORG, 3n);
    expect(members.some((m) => m.userId === 3n)).toBe(false);
    await service.removeMember(ADMIN, ORG, 2n); // leaving
    expect(members.some((m) => m.userId === 2n)).toBe(false);
  });

  it('never removes the last Owner', async () => {
    const { service } = setup(team);
    await expect(service.removeMember(OWNER, ORG, 1n)).rejects.toThrow('at least one Owner');
  });

  it('hands hospitals a departing Admin created to the acting Owner', async () => {
    const { service, hospitals } = setup({ ...team, hospitals: [{ id: 10n, userId: 1n }, { id: 11n, userId: 2n }] });
    await service.removeMember(OWNER, ORG, 2n);
    expect(hospitals.find((h) => h.id === 11n)?.userId).toBe(1n);
  });
});

describe('mine', () => {
  it('shows invitations to Admins and Owners but not to Managers', async () => {
    const ctx = setup(team);
    await ctx.service.invite(OWNER, ORG, { email: 'a@b.c', role: 'Manager' });
    expect((await ctx.service.mine(ADMIN)).invites).toHaveLength(1);
    const asManager = await ctx.service.mine(MGR);
    expect(asManager.invites).toEqual([]);
    expect(asManager.myRole).toBe('Manager');
    expect(asManager.members).toHaveLength(3);
  });

  it('refuses people outside the organization', async () => {
    const { service } = setup(team);
    await expect(service.mine(as(99n))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
