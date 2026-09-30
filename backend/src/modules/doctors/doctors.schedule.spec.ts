import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DoctorsService } from './doctors.service';

const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

function setup(opts: { manages?: boolean; hospitalHours?: [string, string] | null; stored?: any[] } = {}) {
  const stored = opts.stored ?? [];
  const doctor = {
    id: 5n,
    userId: 50n,
    hospitalId: 1n,
    user: {},
    hospital: {
      openTime: opts.hospitalHours === null ? null : t(opts.hospitalHours?.[0] ?? '08:00'),
      closeTime: opts.hospitalHours === null ? null : t(opts.hospitalHours?.[1] ?? '17:00'),
    },
  };
  const ops: string[] = [];
  const prisma: any = {
    doctor: { findUnique: jest.fn(async ({ where }: any) => (where.id === 5n ? doctor : null)) },
    doctorSchedule: {
      findMany: jest.fn(async () => stored),
      deleteMany: jest.fn(async () => { ops.push('delete'); return { count: 0 }; }),
      createMany: jest.fn(async ({ data }: any) => { ops.push(`create:${data.length}`); return { count: data.length }; }),
    },
    $transaction: jest.fn((list: Promise<unknown>[]) => Promise.all(list)),
  };
  const access: any = { canManage: jest.fn().mockResolvedValue(opts.manages ?? false) };
  return { service: new DoctorsService(prisma, access), prisma, ops };
}

const manager = { id: 1n, roles: ['hospital'] } as any;
const theDoctor = { id: 50n, roles: ['doctor'] } as any; // Doctor.userId === 50
const otherDoctor = { id: 99n, roles: ['doctor'] } as any;

const week = [{ weekday: 1, intervals: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '17:00' }] }];

describe('DoctorsService.setSchedule', () => {
  it('a manager of the hospital can set the hours; the week is replaced in one transaction', async () => {
    const { service, ops, prisma } = setup({ manages: true });
    await service.setSchedule(5n, manager, week);
    expect(ops).toEqual(['delete', 'create:2']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('the doctor can set their own hours', async () => {
    const { service, ops } = setup({ manages: false });
    await service.setSchedule(5n, theDoctor, week);
    expect(ops).toEqual(['delete', 'create:2']);
  });

  it("another doctor, or a stranger, cannot change someone else's hours", async () => {
    const { service, ops } = setup({ manages: false });
    await expect(service.setSchedule(5n, otherDoctor, week)).rejects.toBeInstanceOf(ForbiddenException);
    expect(ops).toEqual([]);
  });

  it('an unknown doctor is a 404', async () => {
    await expect(setup({ manages: true }).service.setSchedule(6n, manager, week)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("refuses hours outside the hospital's opening hours, and stores nothing", async () => {
    const { service, ops } = setup({ manages: true, hospitalHours: ['08:00', '17:00'] });
    const early = [{ weekday: 1, intervals: [{ start: '07:00', end: '12:00' }] }];
    const late = [{ weekday: 1, intervals: [{ start: '14:00', end: '18:00' }] }];
    await expect(service.setSchedule(5n, manager, early)).rejects.toThrow(/opening hours \(08:00-17:00\)/);
    await expect(service.setSchedule(5n, manager, late)).rejects.toBeInstanceOf(BadRequestException);
    expect(ops).toEqual([]);
  });

  it('accepts any hours when the hospital has none set', async () => {
    const { service } = setup({ manages: true, hospitalHours: null });
    await expect(service.setSchedule(5n, manager, [{ weekday: 2, intervals: [{ start: '06:00', end: '22:00' }] }])).resolves.toBeDefined();
  });

  it('an empty week clears the schedule (back to following hospital hours)', async () => {
    const { service, ops } = setup({ manages: true });
    await service.setSchedule(5n, manager, []);
    expect(ops).toEqual(['delete', 'create:0']);
  });

  it('bad input is rejected before anything is deleted', async () => {
    const { service, ops } = setup({ manages: true });
    await expect(service.setSchedule(5n, manager, [{ weekday: 9, intervals: [] }])).rejects.toBeInstanceOf(BadRequestException);
    expect(ops).toEqual([]);
  });
});

describe('DoctorsService.getSchedule', () => {
  it('returns the stored week grouped by weekday', async () => {
    const stored = [
      { weekday: 3, startTime: t('09:00'), endTime: t('11:00') },
      { weekday: 1, startTime: t('08:00'), endTime: t('12:00') },
    ];
    const { service } = setup({ stored });
    expect(await service.getSchedule(5n)).toEqual({
      doctorId: 5n,
      days: [
        { weekday: 1, intervals: [{ start: '08:00', end: '12:00' }] },
        { weekday: 3, intervals: [{ start: '09:00', end: '11:00' }] },
      ],
    });
  });
});
