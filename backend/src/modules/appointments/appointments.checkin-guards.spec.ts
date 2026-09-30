import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentRemindersService } from './appointment-reminders.service';

const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const NOW = Date.parse('2026-10-05T03:00:00.000Z'); // 10:00 wall-clock

beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
afterEach(() => jest.restoreAllMocks());

function service(prisma: any) {
  return new AppointmentsService(prisma, {} as any, {} as any, { canManage: jest.fn(), manageableHospitalIds: jest.fn() } as any);
}

describe('status changes after check-in', () => {
  const patient = { id: 10n, roles: ['user'] } as any;

  it('a patient cannot cancel once checked in or completed', async () => {
    for (const status of ['Arrived', 'Completed']) {
      const prisma = {
        appointment: {
          findUnique: jest.fn().mockResolvedValue({ id: 1n, userId: 10n, status, hospital: { userId: 1n }, doctor: { userId: 2n } }),
          update: jest.fn(),
        },
      };
      await expect(service(prisma).cancel(patient, 1n)).rejects.toThrow('cannot be canceled after check-in');
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    }
  });

  it('hospital/doctor cannot re-confirm or reject an appointment that is in progress or finished', async () => {
    for (const status of ['Arrived', 'Completed']) {
      const prisma = {
        appointment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 1n, status, hospitalStatus: 'Confirmed', doctorStatus: 'Confirmed',
            hospital: { userId: 100n }, doctor: { userId: 50n },
          }),
          update: jest.fn(),
        },
      };
      const doctor = { id: 50n, roles: ['doctor'] } as any;
      await expect(service(prisma).updateStatus(doctor, 1n, { target: 'doctor', status: 'Rejected' as any })).rejects.toThrow(/in progress or finished/);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    }
  });

  it('Arrived and Completed cannot be set through the old status endpoint', async () => {
    const prisma = { appointment: { findUnique: jest.fn(), update: jest.fn() } };
    const doctor = { id: 50n, roles: ['doctor'] } as any;
    for (const status of ['Arrived', 'Completed']) {
      await expect(service(prisma).updateStatusForCaller(doctor, 1n, { status })).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(prisma.appointment.findUnique).not.toHaveBeenCalled();
  });
});

describe('the queue', () => {
  const row = (id: number, status: string, time: string, queueNumber: number | null = null, prefix: string | null = null) => ({
    id: BigInt(id), title: 'x', status, hospitalStatus: 'Confirmed', doctorStatus: 'Confirmed',
    appointmentDate: d('2026-10-05'), appointmentTime: t(time), queueNumber, queuePrefix: prefix,
    hospital: { name: 'H' }, hospitalId: 1n, doctor: { id: 5n, hospitalId: 1n, user: {} }, room: null, user: { id: 10n },
  });

  it("lists today's waiting patients in check-in order, then expected ones by time, then finished", async () => {
    const prisma = {
      appointment: {
        findMany: jest.fn().mockResolvedValue([
          row(1, 'Completed', '08:00', 1, 'A'),
          row(2, 'Confirmed', '11:30'),
          row(3, 'Arrived', '09:00', 3, 'B'),
          row(4, 'Missing', '07:00'),
          row(5, 'Arrived', '10:00', 2, 'A'),
          row(6, 'Confirmed', '10:30'),
        ]),
      },
    };
    const result = await service(prisma).queue({ id: 100n, roles: ['hospital'], activeHospitalId: 1n } as any);
    expect(result.items.map((i) => i.id)).toEqual([5n, 3n, 6n, 2n, 1n, 4n]);
    expect(result.items[0].queue_label).toBe('A-2');
    expect(result.counts).toEqual({ waiting: 2, expected: 2, completed: 1, missing: 1 });
    expect(result.date).toBe('2026-10-05');
    const where = prisma.appointment.findMany.mock.calls[0][0].where;
    expect(where.appointmentDate).toEqual(d('2026-10-05'));
    expect(where.hospitalId).toBe(1n); // scoped to the active hospital
    expect(where.status.in).toEqual(expect.arrayContaining(['Arrived', 'Confirmed', 'Completed', 'Missing']));
    expect(where.status.in).not.toContain('Pending');
  });
});

describe('automatic no-shows', () => {
  const svc = (rows: any[]) => {
    const prisma: any = {
      appointment: {
        findMany: jest.fn().mockResolvedValue(rows),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    return { service: new AppointmentRemindersService(prisma, {} as any), prisma };
  };
  const now = new Date('2026-10-05T10:00:00.000Z'); // wall-clock digits

  it('marks Confirmed appointments that started more than the grace period ago, and nothing else', async () => {
    const { service, prisma } = svc([
      { id: 1n, appointmentDate: d('2026-10-05'), appointmentTime: t('08:30') }, // 90 min ago -> missed
      { id: 2n, appointmentDate: d('2026-10-05'), appointmentTime: t('09:00') }, // exactly 60 min: not yet
      { id: 3n, appointmentDate: d('2026-10-05'), appointmentTime: t('09:30') }, // 30 min ago
      { id: 4n, appointmentDate: d('2026-10-05'), appointmentTime: t('11:00') }, // later today
      { id: 5n, appointmentDate: d('2026-10-03'), appointmentTime: t('15:00') }, // days ago -> missed
    ]);
    prisma.appointment.updateMany.mockResolvedValue({ count: 2 });
    expect(await service.markMissed(now)).toBe(2);
    const call = prisma.appointment.updateMany.mock.calls[0][0];
    expect(call.where.id.in.sort()).toEqual([1n, 5n]);
    expect(call.where.status).toBe('Confirmed'); // re-checked in the write: a patient who just arrived is safe
    expect(call.data).toEqual({ status: 'Missing' });
  });

  it('only ever looks at Confirmed appointments and does nothing when none qualify', async () => {
    const { service, prisma } = svc([{ id: 4n, appointmentDate: d('2026-10-05'), appointmentTime: t('11:00') }]);
    expect(await service.markMissed(now)).toBe(0);
    expect(prisma.appointment.findMany.mock.calls[0][0].where.status).toBe('Confirmed');
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
  });
});
