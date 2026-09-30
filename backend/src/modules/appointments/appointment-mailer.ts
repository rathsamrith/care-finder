import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MailService } from '../../core/mail/mail.service';
import {
  AppointmentMailInfo,
  MailableStatus,
  appointmentReminderMail,
  appointmentRequestedMail,
  appointmentStatusMail,
} from '../../core/mail/mail.templates';

export const MAILER_INCLUDE = {
  user: { select: { email: true, firstName: true, name: true } },
  hospital: { select: { name: true } },
  doctor: { include: { user: { select: { firstName: true, lastName: true, name: true } } } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentForMail = Prisma.AppointmentGetPayload<{ include: typeof MAILER_INCLUDE }>;

// Appointment date/time are wall-clock values stored as UTC (see
// availability.util.ts), so they are formatted back with timeZone: 'UTC'.
export function formatWhen(date: Date, time: Date): string {
  const day = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const hh = String(time.getUTCHours()).padStart(2, '0');
  const mm = String(time.getUTCMinutes()).padStart(2, '0');
  return `${day}, ${hh}:${mm}`;
}

// Emails go to the patient only. All methods swallow failures (MailService
// never throws) so a mail problem can't fail a booking.
@Injectable()
export class AppointmentMailer {
  constructor(private readonly mail: MailService) {}

  private info(a: AppointmentForMail): AppointmentMailInfo {
    const appUrl = (process.env.APP_URL ?? process.env.CORS_ORIGIN?.split(',')[0] ?? 'http://localhost:5173').replace(/\/$/, '');
    const doc = a.doctor.user;
    return {
      patientName: a.user.firstName || a.user.name || 'there',
      title: a.title,
      hospitalName: a.hospital.name,
      doctorName: doc.name || `${doc.firstName ?? ''} ${doc.lastName ?? ''}`.trim() || 'Your doctor',
      when: formatWhen(a.appointmentDate, a.appointmentTime),
      url: `${appUrl}/appointment`,
    };
  }

  requested(a: AppointmentForMail) {
    return this.mail.send(a.user.email, appointmentRequestedMail(this.info(a)));
  }

  status(a: AppointmentForMail, status: string) {
    if (status !== 'Confirmed' && status !== 'Canceled' && status !== 'Rejected') return Promise.resolve(false);
    return this.mail.send(a.user.email, appointmentStatusMail(this.info(a), status as MailableStatus));
  }

  reminder(a: AppointmentForMail) {
    return this.mail.send(a.user.email, appointmentReminderMail(this.info(a)));
  }
}
