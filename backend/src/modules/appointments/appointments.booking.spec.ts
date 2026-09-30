import { BadRequestException, ConflictException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const DAY = '2099-01-05';

const patient = { id: 10n, roles: ['user'], email: 'p@x.com', firstName: 'P', lastName: 'Q', permissions: [] };

function setup(
  existing: { appointmentTime: Date; appointmentEnd: Date | null }[] = [],
  schedule: { weekday: number; startTime: Date; endTime: Date }[] = [],
) {
  const created: any[] = [];
  const hospital = { id: 1n, userId: 100n, name: 'H', openTime: t('08:00'), closeTime: t('17:00') };
  const doctor = { id: 2n, userId: 200n, hospitalId: 1n };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    doctorSchedule: { findMany: jest.fn().mockResolvedValue(schedule) },
    appointment: {
      findMany: jest.fn().mockResolvedValue(existing),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: 99n, ...data, status: 'Pending', hospital, doctor: { ...doctor, user: {} }, user: patient, room: null };
        created.push(row);
        return row;
      }),
    },
  };
  const prisma: any = {
    hospital: { findUnique: jest.fn().mockResolvedValue(hospital) },
    doctor: { findUnique: jest.fn().mockResolvedValue(doctor) },
    room: { findUnique: jest.fn() },
    appointmentNotification: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const gateway: any = { emitAppointmentPlaced: jest.fn() };
  const mailer: any = { requested: jest.fn().mockResolvedValue(true), status: jest.fn() };
  const access: any = { notificationRecipientIds: async (h: { userId: bigint }) => [h.userId] };
  const service = new AppointmentsService(prisma, gateway, mailer, access);
  return { service, tx, created, mailer };
}

const dto = (over: Record<string, string> = {}) =>
  ({ title: 'Checkup', hospitalId: '1', doctorId: '2', appointmentDate: DAY, appointmentTime: '09:00', ...over }) as any;

describe('AppointmentsService.create booking rules', () => {
  it('books a free slot, locks the doctor row, and emails the patient', async () => {
    const { service, tx, created, mailer } = setup();
    await service.create(patient as any, dto());
    expect(created).toHaveLength(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mailer.requested).toHaveBeenCalledTimes(1);
  });

  it('rejects an overlapping booking for the same doctor with 409', async () => {
    const { service, created, mailer } = setup([{ appointmentTime: t('09:00'), appointmentEnd: null }]);
    await expect(service.create(patient as any, dto({ appointmentTime: '09:15' }))).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(created).toHaveLength(0);
    expect(mailer.requested).not.toHaveBeenCalled();
  });

  it('respects explicit end times, and allows back-to-back bookings', async () => {
    const busy = [{ appointmentTime: t('09:00'), appointmentEnd: t('10:00') }];
    await expect(setup(busy).service.create(patient as any, dto({ appointmentTime: '09:45' }))).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(setup(busy).service.create(patient as any, dto({ appointmentTime: '10:00' }))).resolves.toBeDefined();
  });

  it('rejects past dates, out-of-hours times and end-before-start', async () => {
    const { service } = setup();
    await expect(service.create(patient as any, dto({ appointmentDate: '2020-01-05' }))).rejects.toThrow(
      /past/i,
    );
    await expect(service.create(patient as any, dto({ appointmentTime: '07:00' }))).rejects.toThrow(
      /opening hours \(08:00 - 17:00\)/,
    );
    await expect(service.create(patient as any, dto({ appointmentTime: '16:45' }))).rejects.toBeInstanceOf(
      BadRequestException,
    ); // default 30-min slot would end 17:15
    await expect(
      service.create(patient as any, dto({ appointmentTime: '10:00', appointmentEnd: '09:30' })),
    ).rejects.toThrow(/after appointmentTime/);
  });
});

// 2099-01-05 is a Monday. Doctor works Mondays 08:00-12:00 and 14:00-17:00 only.
describe('AppointmentsService.create - doctor working hours', () => {
  const row = (weekday: number, start: string, end: string) => ({ weekday, startTime: t(start), endTime: t(end) });
  const monday = [row(1, '08:00', '12:00'), row(1, '14:00', '17:00')];

  it('a doctor without a schedule follows the hospital hours (unchanged behaviour)', async () => {
    await expect(setup([], []).service.create(patient as any, dto({ appointmentTime: '12:30' }))).resolves.toBeDefined();
  });

  it('books inside a working interval', async () => {
    await expect(setup([], monday).service.create(patient as any, dto({ appointmentTime: '09:00' }))).resolves.toBeDefined();
    await expect(setup([], monday).service.create(patient as any, dto({ appointmentTime: '14:00' }))).resolves.toBeDefined();
  });

  it('refuses the lunch break, and a booking that would straddle it, saying when the doctor works', async () => {
    await expect(setup([], monday).service.create(patient as any, dto({ appointmentTime: '12:30' }))).rejects.toThrow(
      'This doctor works 08:00-12:00, 14:00-17:00 on that day',
    );
    await expect(
      setup([], monday).service.create(patient as any, dto({ appointmentTime: '11:45', appointmentEnd: '12:15' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a day the doctor does not work once they have any schedule', async () => {
    const tuesday = '2099-01-06';
    await expect(
      setup([], monday).service.create(patient as any, dto({ appointmentDate: tuesday, appointmentTime: '09:00' })),
    ).rejects.toThrow('This doctor does not work on that day');
  });
});
