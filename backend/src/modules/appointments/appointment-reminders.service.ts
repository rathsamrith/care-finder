import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AppointmentMailer, MAILER_INCLUDE } from './appointment-mailer';
import { wallClockNow } from './availability.util';
import { appointmentStartMs, noShowGraceMinutes } from './check-in.util';

const REMINDER_HOURS = Number(process.env.APPOINTMENT_REMINDER_HOURS) > 0 ? Number(process.env.APPOINTMENT_REMINDER_HOURS) : 24;

// Emails the patient once per confirmed appointment, REMINDER_HOURS before it
// starts. `reminderSentAt` makes it idempotent across runs and restarts.
// Set DISABLE_REMINDERS=true to turn the job off (e.g. on extra instances).
@Injectable()
export class AppointmentRemindersService {
  private readonly logger = new Logger(AppointmentRemindersService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: AppointmentMailer,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    if (process.env.DISABLE_REMINDERS === 'true' || this.running) return;
    this.running = true;
    try {
      await this.sendDueReminders();
      await this.markMissed();
    } catch (error) {
      this.logger.error(`Reminder run failed: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  // Confirmed appointments nobody checked in for, NO_SHOW_GRACE_MINUTES after their
  // start time, become Missing (no-show). Looks back a week so a server that was
  // down does not leave stale "confirmed" visits behind.
  async markMissed(now = wallClockNow()): Promise<number> {
    const grace = noShowGraceMinutes() * 60_000;
    const weekAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const candidates = await this.prisma.appointment.findMany({
      where: { status: AppointmentStatus.Confirmed, appointmentDate: { gte: weekAgo, lte: today } },
      select: { id: true, appointmentDate: true, appointmentTime: true },
    });
    const ids = candidates
      .filter((a) => appointmentStartMs(a.appointmentDate, a.appointmentTime) + grace < now.getTime())
      .map((a) => a.id);
    if (!ids.length) return 0;

    // Re-check the status in the write itself: someone may have checked in meanwhile.
    const result = await this.prisma.appointment.updateMany({
      where: { id: { in: ids }, status: AppointmentStatus.Confirmed },
      data: { status: AppointmentStatus.Missing },
    });
    return result.count;
  }

  async sendDueReminders(now = wallClockNow()): Promise<number> {
    const horizon = new Date(now.getTime() + REMINDER_HOURS * 3_600_000);
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const lastDay = new Date(Date.UTC(horizon.getUTCFullYear(), horizon.getUTCMonth(), horizon.getUTCDate()));

    // Coarse filter by date in SQL, exact window check on date+time in JS.
    const candidates = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.Confirmed,
        reminderSentAt: null,
        appointmentDate: { gte: today, lte: lastDay },
      },
      include: MAILER_INCLUDE,
    });

    let sent = 0;
    for (const a of candidates) {
      const start = Date.UTC(
        a.appointmentDate.getUTCFullYear(),
        a.appointmentDate.getUTCMonth(),
        a.appointmentDate.getUTCDate(),
        a.appointmentTime.getUTCHours(),
        a.appointmentTime.getUTCMinutes(),
      );
      if (start <= now.getTime() || start > horizon.getTime()) continue;

      // Claim first (conditional update), so two instances can't both send.
      const claimed = await this.prisma.appointment.updateMany({
        where: { id: a.id, reminderSentAt: null },
        data: { reminderSentAt: new Date() },
      });
      if (claimed.count === 0) continue;

      const ok = await this.mailer.reminder(a);
      if (ok) {
        sent += 1;
      } else {
        // Release the claim so a later run retries (mail outage, no MAIL_HOST).
        await this.prisma.appointment.update({ where: { id: a.id }, data: { reminderSentAt: null } });
      }
    }
    return sent;
  }
}
