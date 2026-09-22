import { AppointmentRemindersService } from './appointment-reminders.service';

const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
// Wall-clock "now": 2026-10-01 10:00
const NOW = new Date('2026-10-01T10:00:00.000Z');

const appt = (id: bigint, date: string, time: string) => ({ id, appointmentDate: d(date), appointmentTime: t(time) });

function setup(rows: any[], mailOk = true) {
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const update = jest.fn().mockResolvedValue({});
  const prisma: any = { appointment: { findMany: jest.fn().mockResolvedValue(rows), updateMany, update } };
  const mailer: any = { reminder: jest.fn().mockResolvedValue(mailOk) };
  return { service: new AppointmentRemindersService(prisma, mailer), updateMany, update, mailer, prisma };
}

describe('AppointmentRemindersService.sendDueReminders', () => {
  it('only reminds appointments starting within the next 24h', async () => {
    const { service, mailer } = setup([
      appt(1n, '2026-10-01', '09:00'), // already started
      appt(2n, '2026-10-01', '15:00'), // in 5h - due
      appt(3n, '2026-10-02', '09:59'), // in 23h59 - due
      appt(4n, '2026-10-02', '10:30'), // in 24h30 - not yet
    ]);
    const sent = await service.sendDueReminders(NOW);
    expect(sent).toBe(2);
    expect(mailer.reminder).toHaveBeenCalledTimes(2);
  });

  it('claims the row before sending, and skips rows another instance already claimed', async () => {
    const { service, updateMany, mailer } = setup([appt(2n, '2026-10-01', '15:00')]);
    updateMany.mockResolvedValue({ count: 0 });
    expect(await service.sendDueReminders(NOW)).toBe(0);
    expect(mailer.reminder).not.toHaveBeenCalled();
  });

  it('releases the claim when sending fails so a later run retries', async () => {
    const { service, update } = setup([appt(2n, '2026-10-01', '15:00')], false);
    expect(await service.sendDueReminders(NOW)).toBe(0);
    expect(update).toHaveBeenCalledWith({ where: { id: 2n }, data: { reminderSentAt: null } });
  });

  it('queries only confirmed, not-yet-reminded appointments', async () => {
    const { service, prisma } = setup([]);
    await service.sendDueReminders(NOW);
    const where = prisma.appointment.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('Confirmed');
    expect(where.reminderSentAt).toBeNull();
  });
});
