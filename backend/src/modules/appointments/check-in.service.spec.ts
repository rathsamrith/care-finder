import 'reflect-metadata';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { checkInCode } from './check-in.util';

// "Now" is pinned to 10:00 wall-clock on 2026-10-05 (server default offset +07:00).
const NOW = Date.parse('2026-10-05T03:00:00.000Z');
const TODAY = new Date('2026-10-05T00:00:00.000Z');
const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

type Appt = Record<string, any>;

function setup(seed: Appt[] = [], opts: { hospitalCoords?: [string, string] | null } = {}) {
  const coords = opts.hospitalCoords === undefined ? (['11.5564', '104.9282'] as [string, string]) : opts.hospitalCoords;
  const hospitals: Record<string, any> = {
    '1': { id: 1n, userId: 100n, organizationId: null, name: 'Sunrise', latitude: coords?.[0] ?? null, longitude: coords?.[1] ?? null },
    '2': { id: 2n, userId: 200n, organizationId: null, name: 'Other', latitude: '11.0', longitude: '104.0' },
  };
  const store = new Map<string, Appt>();
  const base = (id: bigint, over: Appt = {}): Appt => ({
    id, title: 'Checkup', userId: 10n, hospitalId: 1n, doctorId: 5n, roomId: null, status: 'Confirmed',
    appointmentDate: TODAY, appointmentTime: t('10:00'), appointmentEnd: null,
    checkedInAt: null, checkInMethod: null, queueNumber: null, queuePrefix: null, ...over,
  });
  seed.forEach((a) => store.set(String(a.id), base(a.id, a)));

  const withRelations = (a: Appt) => ({
    ...a,
    hospital: hospitals[String(a.hospitalId)],
    room: a.roomId ? { id: a.roomId, name: 'Room 204' } : null,
    user: { id: a.userId, firstName: 'Sokha', lastName: 'Chan', name: 'Sokha Chan' },
    doctor: { id: a.doctorId, userId: 50n, user: { firstName: 'Dara', lastName: 'Vann', name: null } },
  });

  const notifications: any[] = [];
  const prisma: any = {
    appointment: {
      findUnique: jest.fn(async ({ where }: any) => (store.has(String(where.id)) ? withRelations(store.get(String(where.id))!) : null)),
      findUniqueOrThrow: jest.fn(async ({ where }: any) => ({ ...store.get(String(where.id)) })),
      aggregate: jest.fn(async ({ where }: any) => ({
        _max: {
          queueNumber: Math.max(
            0,
            ...[...store.values()]
              .filter((a) => a.hospitalId === where.hospitalId && +a.appointmentDate === +where.appointmentDate)
              .map((a) => a.queueNumber ?? 0),
          ) || null,
        },
      })),
      update: jest.fn(async ({ where, data }: any) => {
        Object.assign(store.get(String(where.id))!, data);
        return withRelations(store.get(String(where.id))!);
      }),
      count: jest.fn(async ({ where }: any) =>
        [...store.values()].filter(
          (a) => a.doctorId === where.doctorId && a.status === where.status && a.queueNumber !== null && a.queueNumber < where.queueNumber.lt,
        ).length,
      ),
    },
    appointmentNotification: { create: jest.fn(async ({ data }: any) => notifications.push(data)) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const gateway: any = { emitNotification: jest.fn(), emitAppointmentStatusChanged: jest.fn() };
  const access: any = {
    notificationRecipientIds: jest.fn(async (h: any) => [h.userId]),
    canManage: jest.fn(async (hospitalId: bigint, user: any) => user.manages === true),
  };
  return { service: new CheckInService(prisma, gateway, access), store, notifications, gateway, access, prisma };
}

const kiosk = { hospitalId: 1n, prefix: 'B' };
const patient = { id: 10n, roles: ['user'] } as any;
const doctor = { id: 50n, roles: ['doctor'] } as any;
const reception = { id: 100n, roles: ['hospital'], manages: true } as any;

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = 'test-secret';
});
beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
afterEach(() => jest.restoreAllMocks());

const at = (iso: string) => jest.spyOn(Date, 'now').mockReturnValue(Date.parse(iso)); // pin a different "now" (UTC)

describe('kiosk check-in', () => {
  it('checks a confirmed patient in, numbers the ticket with the kiosk letter, and tells the staff', async () => {
    const { service, store, notifications, gateway } = setup([{ id: 7n }]);
    const ticket = await service.checkInByKiosk(kiosk, checkInCode(7n));

    expect(ticket.queueLabel).toBe('B-1');
    expect(ticket).toMatchObject({ status: 'Arrived', alreadyCheckedIn: false, patientFirstName: 'Sokha', doctor: 'Dara Vann', appointmentTime: '10:00' });
    expect(store.get('7')).toMatchObject({ status: 'Arrived', queueNumber: 1, queuePrefix: 'B', checkInMethod: 'kiosk' });
    // hospital owner (100) and the doctor (50) are notified; the patient's screen is refreshed
    expect(notifications.map((n) => String(n.userId)).sort()).toEqual(['100', '50']);
    expect(notifications[0].type).toBe('Patient_Arrived');
    expect(gateway.emitAppointmentStatusChanged).toHaveBeenCalledWith(10n, expect.objectContaining({ queue: 'B-1' }));
  });

  it('hands out consecutive numbers per hospital and day', async () => {
    const { service } = setup([{ id: 7n }, { id: 8n, userId: 11n }, { id: 9n, userId: 12n }]);
    const labels = [];
    for (const id of [7n, 8n, 9n]) labels.push((await service.checkInByKiosk(kiosk, checkInCode(id))).queueLabel);
    expect(labels).toEqual(['B-1', 'B-2', 'B-3']);
  });

  it('a second kiosk keeps counting (one sequence per hospital) but shows its own letter', async () => {
    const { service } = setup([{ id: 7n }, { id: 8n, userId: 11n }]);
    expect((await service.checkInByKiosk({ hospitalId: 1n, prefix: 'A' }, checkInCode(7n))).queueLabel).toBe('A-1');
    expect((await service.checkInByKiosk({ hospitalId: 1n, prefix: 'B' }, checkInCode(8n))).queueLabel).toBe('B-2');
  });

  it('queue numbers restart per hospital', async () => {
    const { service } = setup([{ id: 7n }, { id: 8n, hospitalId: 2n, userId: 11n }]);
    await service.checkInByKiosk(kiosk, checkInCode(7n));
    expect((await service.checkInByKiosk({ hospitalId: 2n, prefix: 'C' }, checkInCode(8n))).queueLabel).toBe('C-1');
  });

  it('checking in again returns the same ticket: no new number, no new notifications', async () => {
    const { service, notifications } = setup([{ id: 7n }]);
    await service.checkInByKiosk(kiosk, checkInCode(7n));
    const again = await service.checkInByKiosk(kiosk, checkInCode(7n));
    expect(again).toMatchObject({ queueLabel: 'B-1', alreadyCheckedIn: true });
    expect(notifications).toHaveLength(2);
  });

  it('a bad code and a code for another hospital are refused with the same message', async () => {
    const { service } = setup([{ id: 7n }, { id: 8n, hospitalId: 2n }]);
    const message = 'This code is not valid. Please ask reception for help.';
    await expect(service.checkInByKiosk(kiosk, 'garbage')).rejects.toThrow(message);
    await expect(service.checkInByKiosk(kiosk, checkInCode(8n))).rejects.toThrow(message); // belongs to hospital 2
    await expect(service.checkInByKiosk(kiosk, checkInCode(999n))).rejects.toThrow(message); // valid signature, no such appointment
  });

  it('says why when the appointment cannot be checked in', async () => {
    const cases: [string, RegExp][] = [
      ['Pending', /not been confirmed/],
      ['Canceled', /canceled/],
      ['Rejected', /canceled/],
      ['Completed', /already completed/],
      ['Missing', /marked as missed/],
    ];
    for (const [status, pattern] of cases) {
      const { service } = setup([{ id: 7n, status }]);
      await expect(service.checkInByKiosk(kiosk, checkInCode(7n))).rejects.toThrow(pattern);
    }
  });

  it('only works inside the window: 60 min before to 30 min after the start', async () => {
    const { service } = setup([{ id: 7n }]);
    at('2026-10-05T01:59:00.000Z'); // 08:59 local
    await expect(service.checkInByKiosk(kiosk, checkInCode(7n))).rejects.toThrow('Check-in opens at 09:00.');
    at('2026-10-05T03:31:00.000Z'); // 10:31 local
    await expect(service.checkInByKiosk(kiosk, checkInCode(7n))).rejects.toThrow(/time has passed/);
    at('2026-10-05T03:30:00.000Z'); // 10:30 local: last minute
    await expect(service.checkInByKiosk(kiosk, checkInCode(7n))).resolves.toBeDefined();
  });
});

describe('phone check-in', () => {
  const near = { latitude: 11.5566, longitude: 104.9284 }; // ~30 m from the hospital
  const far = { latitude: 11.6564, longitude: 104.9282 }; // ~11 km away

  it('works with the phone near the hospital, and is labelled P', async () => {
    const { service, store } = setup([{ id: 7n }]);
    const ticket = await service.checkInSelf(patient, 7n, near);
    expect(ticket.queueLabel).toBe('P-1');
    expect(store.get('7')?.checkInMethod).toBe('phone');
  });

  it('refuses a phone that is too far away, saying how far', async () => {
    const { service, store } = setup([{ id: 7n }]);
    await expect(service.checkInSelf(patient, 7n, far)).rejects.toThrow(/11 km from the hospital/);
    expect(store.get('7')?.status).toBe('Confirmed');
  });

  it('needs the location, and a hospital with no coordinates cannot be checked in to from a phone', async () => {
    await expect(setup([{ id: 7n }]).service.checkInSelf(patient, 7n, {})).rejects.toThrow('Your location is needed');
    const { service } = setup([{ id: 7n }], { hospitalCoords: null });
    await expect(service.checkInSelf(patient, 7n, near)).rejects.toThrow(/no location on file/);
  });

  it('is also limited to the time window', async () => {
    const { service } = setup([{ id: 7n }]);
    at('2026-10-05T01:00:00.000Z'); // 08:00 local
    await expect(service.checkInSelf(patient, 7n, near)).rejects.toThrow(/Check-in opens at 09:00/);
  });

  it("only the patient's own appointment", async () => {
    const { service } = setup([{ id: 7n, userId: 11n }]);
    await expect(service.checkInSelf(patient, 7n, near)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('reception check-in', () => {
  it('reception or the doctor can check a patient in at any time today, labelled R', async () => {
    at('2026-10-05T01:00:00.000Z'); // long before the window
    const { service } = setup([{ id: 7n }, { id: 8n, userId: 11n }]);
    expect((await service.checkInStaff(reception, 7n)).queueLabel).toBe('R-1');
    expect((await service.checkInStaff(doctor, 8n)).queueLabel).toBe('R-2');
  });

  it("only today's appointments", async () => {
    const { service } = setup([{ id: 7n, appointmentDate: new Date('2026-10-06T00:00:00.000Z') }]);
    await expect(service.checkInStaff(reception, 7n)).rejects.toThrow("Only today's appointments");
  });

  it('can bring back an appointment that was auto-marked as missed (a late arrival)', async () => {
    const { service } = setup([{ id: 7n, status: 'Missing' }]);
    await expect(service.checkInStaff(reception, 7n)).resolves.toMatchObject({ status: 'Arrived' });
  });

  it('refuses people who are neither that doctor nor staff of that hospital', async () => {
    const { service } = setup([{ id: 7n }]);
    await expect(service.checkInStaff({ id: 99n, roles: ['doctor'] } as any, 7n)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.checkInStaff({ id: 98n, roles: ['hospital'], manages: false } as any, 7n)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.checkInStaff(patient, 7n)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('completing a visit', () => {
  it('the doctor or reception can complete an arrived patient', async () => {
    const { service, store, gateway } = setup([{ id: 7n }]);
    await service.checkInStaff(reception, 7n);
    const ticket = await service.complete(doctor, 7n);
    expect(ticket.status).toBe('Completed');
    expect(store.get('7')?.completedAt).toBeInstanceOf(Date);
    expect(gateway.emitAppointmentStatusChanged).toHaveBeenLastCalledWith(10n, expect.objectContaining({ status: 'Completed' }));
    const other = setup([{ id: 8n }]);
    await other.service.checkInStaff(reception, 8n);
    await expect(other.service.complete(reception, 8n)).resolves.toBeDefined();
  });

  it('a confirmed patient who was never checked in can still be completed (walk-through)', async () => {
    const { service } = setup([{ id: 7n }]);
    await expect(service.complete(doctor, 7n)).resolves.toMatchObject({ status: 'Completed' });
  });

  it('only checked-in or confirmed appointments, and only by the right people', async () => {
    const { service } = setup([{ id: 7n, status: 'Pending' }, { id: 8n, status: 'Canceled' }, { id: 9n }]);
    await expect(service.complete(doctor, 7n)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.complete(doctor, 8n)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.complete({ id: 99n, roles: ['doctor'] } as any, 9n)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('the ticket', () => {
  it('counts the people checked in ahead for the same doctor and estimates the wait', async () => {
    const { service } = setup([
      { id: 6n, userId: 9n, status: 'Arrived', queueNumber: 1, queuePrefix: 'A', appointmentEnd: t('10:20') },
      { id: 7n, userId: 10n, appointmentEnd: t('10:20') },
    ]);
    const ticket = await service.checkInByKiosk(kiosk, checkInCode(7n));
    expect(ticket.queueLabel).toBe('B-2');
    expect(ticket.peopleAhead).toBe(1);
    expect(ticket.estimatedWaitMinutes).toBe(20); // 1 ahead x 20-minute appointment
  });

  it('shows the room and only the first name (kiosk screens are public)', async () => {
    const { service } = setup([{ id: 7n, roomId: 3n }]);
    const ticket = await service.checkInByKiosk(kiosk, checkInCode(7n));
    expect(ticket.room).toBe('Room 204');
    expect(ticket.patientFirstName).toBe('Sokha');
    expect(JSON.stringify(ticket, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))).not.toContain('Chan');
  });

  it('gives the patient their code, the window, and their ticket once in', async () => {
    const { service } = setup([{ id: 7n }]);
    const before = await service.codeFor(patient, 7n);
    expect(before).toMatchObject({ code: checkInCode(7n), window: 'open', opensAt: '09:00', closesAt: '10:30', ticket: null });
    expect(before.appointment).toEqual({
      reference: 'CF-000007',
      title: 'Checkup',
      patientName: 'Sokha Chan',
      hospital: 'Sunrise',
      hospitalAddress: null, // the fake hospital has no address fields
      doctor: 'Dara Vann',
      room: null,
      date: '2026-10-05',
      time: '10:00',
      endTime: null,
      arriveBy: '09:45', // 15 minutes before
    });
    await service.checkInByKiosk(kiosk, checkInCode(7n));
    expect((await service.codeFor(patient, 7n)).ticket?.queueLabel).toBe('B-1');
    await expect(service.codeFor({ id: 99n, roles: ['user'] } as any, 7n)).rejects.toBeInstanceOf(NotFoundException);
  });
});
