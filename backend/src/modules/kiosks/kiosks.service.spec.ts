import 'reflect-metadata';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateKioskDto } from './dto/kiosk.dto';
import { hashKioskKey, KiosksService } from './kiosks.service';

function setup(opts: { activeKiosks?: number; stored?: any[] } = {}) {
  const created: any[] = [];
  const stored = opts.stored ?? [];
  const prisma: any = {
    kiosk: {
      count: jest.fn(async () => opts.activeKiosks ?? 0),
      create: jest.fn(async ({ data, select }: any) => {
        created.push(data);
        return { id: 1n, name: data.name, prefix: data.prefix, createdAt: new Date() };
      }),
      findMany: jest.fn(async () => stored),
      updateMany: jest.fn(async ({ where }: any) => ({ count: where.id === 1n ? 1 : 0 })),
      findUnique: jest.fn(async ({ where }: any) => stored.find((k) => k.keyHash === where.keyHash) ?? null),
      update: jest.fn(async () => ({})),
    },
  };
  const access: any = { assertCanManage: jest.fn().mockResolvedValue({}) };
  return { service: new KiosksService(prisma, access), prisma, access, created };
}
const admin = { id: 1n, roles: ['hospital'] } as any;

describe('KiosksService.create', () => {
  it('returns the device key exactly once and stores only its hash', async () => {
    const { service, created } = setup();
    const result = await service.create(admin, 1n, { name: 'Main entrance', prefix: 'A' });
    expect(result.key).toMatch(/^kk_[a-f0-9]{64}$/);
    expect(created[0].keyHash).toBe(hashKioskKey(result.key));
    const storedValues = Object.values(created[0]).map(String);
    expect(storedValues).not.toContain(result.key);
    expect(storedValues.join('|')).not.toContain(result.key.slice(3)); // not even the raw hex
  });

  it('gives every kiosk a different key', async () => {
    const { service } = setup();
    const a = await service.create(admin, 1n, { name: 'A', prefix: 'A' });
    const b = await service.create(admin, 1n, { name: 'B', prefix: 'B' });
    expect(a.key).not.toBe(b.key);
  });

  it('needs the Admin role in the hospital, and is capped at 10 active kiosks', async () => {
    const { service, access } = setup();
    await service.create(admin, 1n, { name: 'A', prefix: 'A' });
    expect(access.assertCanManage).toHaveBeenCalledWith(1n, admin, 'Admin');
    await expect(setup({ activeKiosks: 10 }).service.create(admin, 1n, { name: 'X', prefix: 'X' })).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('KiosksService list/revoke', () => {
  it('list never exposes the key or its hash', async () => {
    const { service, prisma } = setup({ stored: [{ id: 1n, name: 'A', prefix: 'A' }] });
    await service.list(admin, 1n);
    const select = prisma.kiosk.findMany.mock.calls[0][0].select;
    expect(select.keyHash).toBeUndefined();
    expect(select.key).toBeUndefined();
  });

  it('revoke needs Admin, only touches this hospital\'s live kiosks, and 404s otherwise', async () => {
    const { service, prisma, access } = setup();
    await service.revoke(admin, 1n, 1n);
    expect(access.assertCanManage).toHaveBeenCalledWith(1n, admin, 'Admin');
    expect(prisma.kiosk.updateMany.mock.calls[0][0].where).toEqual({ id: 1n, hospitalId: 1n, revokedAt: null });
    await expect(service.revoke(admin, 1n, 2n)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('KiosksService.authenticate', () => {
  const key = `kk_${'ab'.repeat(32)}`;
  const row = (over: object = {}) => ({ id: 1n, hospitalId: 1n, name: 'A', prefix: 'A', keyHash: hashKioskKey(key), revokedAt: null, lastSeenAt: null, hospital: { id: 1n, name: 'Sunrise' }, ...over });

  it('accepts a live kiosk key and records that it was seen', async () => {
    const { service, prisma } = setup({ stored: [row()] });
    expect((await service.authenticate(key)).hospitalId).toBe(1n);
    expect(prisma.kiosk.update).toHaveBeenCalledTimes(1);
  });

  it('does not write "last seen" on every scan (only when stale)', async () => {
    const { service, prisma } = setup({ stored: [row({ lastSeenAt: new Date() })] });
    await service.authenticate(key);
    expect(prisma.kiosk.update).not.toHaveBeenCalled();
  });

  it('rejects unknown, revoked and malformed keys without touching the database for junk', async () => {
    const { service, prisma } = setup({ stored: [row({ revokedAt: new Date() })] });
    await expect(service.authenticate(key)).rejects.toBeInstanceOf(UnauthorizedException); // revoked
    await expect(service.authenticate(`kk_${'cd'.repeat(32)}`)).rejects.toBeInstanceOf(UnauthorizedException); // unknown
    prisma.kiosk.findUnique.mockClear();
    for (const junk of ['', 'nope', 'kk_short', `xx_${'ab'.repeat(32)}`, undefined as any]) {
      await expect(service.authenticate(junk)).rejects.toBeInstanceOf(UnauthorizedException);
    }
    expect(prisma.kiosk.findUnique).not.toHaveBeenCalled();
  });
});

describe('CreateKioskDto', () => {
  const errors = async (plain: object) =>
    (await validate(plainToInstance(CreateKioskDto, plain), { whitelist: true, forbidNonWhitelisted: true })).map((e) => e.property);

  it('normalises the prefix to capital letters and trims the name', async () => {
    const dto = plainToInstance(CreateKioskDto, { name: '  Main entrance ', prefix: ' b ' });
    expect(await validate(dto)).toEqual([]);
    expect([dto.name, dto.prefix]).toEqual(['Main entrance', 'B']);
  });

  it('prefix must be 1-3 letters; name required', async () => {
    expect(await errors({ name: 'A', prefix: '' })).toEqual(['prefix']);
    expect(await errors({ name: 'A', prefix: 'ABCD' })).toEqual(['prefix']);
    expect(await errors({ name: 'A', prefix: 'A1' })).toEqual(['prefix']);
    expect(await errors({ name: '  ', prefix: 'A' })).toEqual(['name']);
  });
});
