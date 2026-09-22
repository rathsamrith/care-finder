import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotificationsGateway } from '../../core/websocket/notifications.gateway';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { slotMinutes, minutesOf } from './availability.util';
import {
  appointmentStartMs,
  arriveEarlyMinutes,
  bookingReference,
  checkInCode,
  checkInRadiusMeters,
  checkInState,
  distanceMeters,
  estimateWaitMinutes,
  isSameWallClockDay,
  parseCheckInCode,
  queueLabel,
} from './check-in.util';

const INCLUDE = {
  hospital: true,
  room: true,
  user: { select: { id: true, firstName: true, lastName: true, name: true } },
  doctor: { include: { user: { select: { firstName: true, lastName: true, name: true } } } },
} satisfies Prisma.AppointmentInclude;

type AppointmentForCheckIn = Prisma.AppointmentGetPayload<{ include: typeof INCLUDE }>;

type Method = 'kiosk' | 'phone' | 'staff';

const hhmm = (ms: number) => new Date(ms).toISOString().slice(11, 16);

// Turning up at the hospital: Confirmed -> Arrived (gets a queue number) ->
// Completed. Three ways in: a kiosk scanning/typing the patient's code, the
// patient's own phone (time window + location), or reception. Every route goes
// through perform(), so the rules and the numbering are in one place.
@Injectable()
export class CheckInService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly access: HospitalAccessService,
  ) {}

  // ---- the patient's code (shown as QR / text, scanned at a kiosk) -------------
  async codeFor(user: AuthenticatedUser, id: bigint) {
    const a = await this.prisma.appointment.findUnique({ where: { id }, include: INCLUDE });
    if (!a || a.userId !== user.id) throw new NotFoundException('Appointment not found');
    const window = checkInState(a.appointmentDate, a.appointmentTime);
    const start = appointmentStartMs(a.appointmentDate, a.appointmentTime);
    const doctor = a.doctor.user;
    return {
      code: checkInCode(a.id),
      // Everything the patient's digital pass shows (it is their own appointment).
      appointment: {
        reference: bookingReference(a.id),
        title: a.title,
        patientName: a.user.name || `${a.user.firstName ?? ''} ${a.user.lastName ?? ''}`.trim() || null,
        hospital: a.hospital.name,
        hospitalAddress: [a.hospital.streetAddress, a.hospital.commune, a.hospital.district, a.hospital.province].filter(Boolean).join(', ') || null,
        doctor: doctor.name || `${doctor.firstName ?? ''} ${doctor.lastName ?? ''}`.trim() || null,
        room: a.room?.name ?? null,
        date: a.appointmentDate.toISOString().slice(0, 10),
        time: hhmm(start),
        endTime: a.appointmentEnd ? hhmm(appointmentStartMs(a.appointmentDate, a.appointmentEnd)) : null,
        arriveBy: hhmm(start - arriveEarlyMinutes() * 60_000),
      },
      status: a.status,
      window: window.state, // early | open | late
      opensAt: hhmm(window.opensAt),
      closesAt: hhmm(window.closesAt),
      ticket: a.status === AppointmentStatus.Arrived ? await this.ticket(a) : null,
    };
  }

  // ---- kiosk ---------------------------------------------------------------------
  async checkInByKiosk(kiosk: { hospitalId: bigint; prefix: string }, rawCode: string) {
    const invalid = new BadRequestException('This code is not valid. Please ask reception for help.');
    const id = parseCheckInCode(rawCode);
    if (id === null) throw invalid;

    const a = await this.prisma.appointment.findUnique({ where: { id }, include: INCLUDE });
    // A code for another hospital looks exactly like a bad code: nothing to learn.
    if (!a || a.hospitalId !== kiosk.hospitalId) throw invalid;

    return this.perform(a, { method: 'kiosk', prefix: kiosk.prefix, enforceWindow: true });
  }

  // ---- the patient's own phone ---------------------------------------------------
  async checkInSelf(user: AuthenticatedUser, id: bigint, where: { latitude?: number; longitude?: number }) {
    const a = await this.prisma.appointment.findUnique({ where: { id }, include: INCLUDE });
    if (!a || a.userId !== user.id) throw new NotFoundException('Appointment not found');

    // Without a kiosk, "I'm here" must be checked: the time window (in perform)
    // and the phone being near the hospital.
    const hLat = parseFloat(a.hospital.latitude ?? '');
    const hLng = parseFloat(a.hospital.longitude ?? '');
    if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) {
      throw new BadRequestException('This hospital has no location on file. Please check in at the kiosk or reception.');
    }
    if (!Number.isFinite(where.latitude) || !Number.isFinite(where.longitude)) {
      throw new BadRequestException('Your location is needed to check in from your phone.');
    }
    const away = distanceMeters(where.latitude as number, where.longitude as number, hLat, hLng);
    if (away > checkInRadiusMeters()) {
      const km = away >= 10_000 ? `${Math.round(away / 1000)} km` : `${(away / 1000).toFixed(1)} km`;
      throw new BadRequestException(`You seem to be ${km} from the hospital. Get closer, or check in at the kiosk or reception.`);
    }

    return this.perform(a, { method: 'phone', prefix: 'P', enforceWindow: true });
  }

  // ---- reception / the doctor ----------------------------------------------------
  async checkInStaff(user: AuthenticatedUser, id: bigint) {
    const a = await this.loadForStaff(user, id);
    if (!isSameWallClockDay(a.appointmentDate)) {
      throw new BadRequestException("Only today's appointments can be checked in.");
    }
    return this.perform(a, { method: 'staff', prefix: 'R', enforceWindow: false, allowFromMissing: true });
  }

  async complete(user: AuthenticatedUser, id: bigint) {
    const a = await this.loadForStaff(user, id);
    if (a.status !== AppointmentStatus.Arrived && a.status !== AppointmentStatus.Confirmed) {
      throw new BadRequestException('Only a checked-in or confirmed appointment can be completed.');
    }
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.Completed, completedAt: new Date() },
      include: INCLUDE,
    });
    this.gateway.emitAppointmentStatusChanged(a.userId, {
      appointmentId: a.id.toString(),
      status: updated.status,
    });
    return this.ticket(updated);
  }

  // ---- shared ----------------------------------------------------------------------
  private async loadForStaff(user: AuthenticatedUser, id: bigint) {
    const a = await this.prisma.appointment.findUnique({ where: { id }, include: INCLUDE });
    if (!a) throw new NotFoundException('Appointment not found');
    const ownDoctor = user.roles.includes('doctor') && a.doctor.userId === user.id;
    const hospitalStaff = user.roles.includes('hospital') && (await this.access.canManage(a.hospitalId, user));
    if (!ownDoctor && !hospitalStaff) {
      throw new ForbiddenException('You do not have access to this appointment');
    }
    return a;
  }

  private async perform(
    a: AppointmentForCheckIn,
    opts: { method: Method; prefix: string; enforceWindow: boolean; allowFromMissing?: boolean },
  ) {
    if (a.status === AppointmentStatus.Arrived) return this.ticket(a, true); // already in: same ticket, no new number

    const refusal = this.refusalFor(a.status, opts.allowFromMissing);
    if (refusal) throw new BadRequestException(refusal);

    if (opts.enforceWindow) {
      const { state, opensAt } = checkInState(a.appointmentDate, a.appointmentTime);
      if (state === 'early') throw new BadRequestException(`Check-in opens at ${hhmm(opensAt)}.`);
      if (state === 'late') throw new BadRequestException('The check-in time has passed. Please see reception.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Numbers are handed out one at a time per hospital, so two people
      // checking in at the same moment can never get the same queue number.
      await tx.$queryRaw`SELECT id FROM hospitals WHERE id = ${a.hospitalId} FOR UPDATE`;
      const fresh = await tx.appointment.findUniqueOrThrow({ where: { id: a.id }, select: { status: true } });
      if (fresh.status === AppointmentStatus.Arrived) return { already: true as const };
      const stillRefused = this.refusalFor(fresh.status, opts.allowFromMissing);
      if (stillRefused) throw new BadRequestException(stillRefused);

      const max = await tx.appointment.aggregate({
        _max: { queueNumber: true },
        where: { hospitalId: a.hospitalId, appointmentDate: a.appointmentDate },
      });
      const updated = await tx.appointment.update({
        where: { id: a.id },
        data: {
          status: AppointmentStatus.Arrived,
          checkedInAt: new Date(),
          checkInMethod: opts.method,
          queueNumber: (max._max.queueNumber ?? 0) + 1,
          queuePrefix: opts.prefix,
        },
        include: INCLUDE,
      });
      return { already: false as const, updated };
    });

    if (result.already) {
      const current = await this.prisma.appointment.findUniqueOrThrow({ where: { id: a.id }, include: INCLUDE });
      return this.ticket(current, true);
    }

    await this.notifyArrival(result.updated);
    return this.ticket(result.updated);
  }

  private refusalFor(status: AppointmentStatus, allowFromMissing?: boolean): string | null {
    switch (status) {
      case AppointmentStatus.Confirmed:
        return null;
      case AppointmentStatus.Missing:
        return allowFromMissing ? null : 'This appointment was marked as missed. Please see reception.';
      case AppointmentStatus.Pending:
        return 'This appointment has not been confirmed by the hospital yet.';
      case AppointmentStatus.Completed:
        return 'This visit is already completed.';
      default:
        return 'This appointment was canceled.';
    }
  }

  // The doctor and the hospital's managers see "patient arrived" at once.
  private async notifyArrival(a: AppointmentForCheckIn) {
    const label = queueLabel(a.queuePrefix, a.queueNumber);
    const who = a.user.name || `${a.user.firstName ?? ''} ${a.user.lastName ?? ''}`.trim() || 'A patient';
    const recipients = [
      ...new Set([...(await this.access.notificationRecipientIds(a.hospital)), a.doctor.userId].map(String)),
    ].map((id) => BigInt(id));

    for (const userId of recipients) {
      await this.prisma.appointmentNotification.create({
        data: {
          userId,
          appointmentId: a.id,
          fromUserId: a.userId,
          type: NotificationType.Patient_Arrived,
          message: `${who} has arrived for "${a.title}"${label ? ` (queue ${label})` : ''}.`,
        },
      });
      this.gateway.emitNotification(userId, { type: NotificationType.Patient_Arrived, appointmentId: a.id.toString() });
    }
    this.gateway.emitAppointmentStatusChanged(a.userId, {
      appointmentId: a.id.toString(),
      status: a.status,
      queue: label,
    });
  }

  // What a patient sees (and a kiosk prints/shows). Only the first name: kiosk
  // screens are in public.
  async ticket(a: AppointmentForCheckIn, alreadyCheckedIn = false) {
    const duration =
      a.appointmentEnd && minutesOf(a.appointmentEnd) > minutesOf(a.appointmentTime)
        ? minutesOf(a.appointmentEnd) - minutesOf(a.appointmentTime)
        : slotMinutes();
    let ahead = 0;
    if (a.status === AppointmentStatus.Arrived && a.queueNumber !== null) {
      ahead = await this.prisma.appointment.count({
        where: {
          doctorId: a.doctorId,
          appointmentDate: a.appointmentDate,
          status: AppointmentStatus.Arrived,
          queueNumber: { lt: a.queueNumber },
        },
      });
    }
    const doctor = a.doctor.user;
    return {
      appointmentId: a.id,
      alreadyCheckedIn,
      status: a.status,
      queueLabel: queueLabel(a.queuePrefix, a.queueNumber),
      queueNumber: a.queueNumber,
      patientFirstName: a.user.firstName || a.user.name?.split(' ')[0] || null,
      hospital: a.hospital.name,
      doctor: doctor.name || `${doctor.firstName ?? ''} ${doctor.lastName ?? ''}`.trim() || null,
      room: a.room?.name ?? null,
      title: a.title,
      appointmentTime: hhmm(appointmentStartMs(a.appointmentDate, a.appointmentTime)),
      checkedInAt: a.checkedInAt,
      peopleAhead: ahead,
      estimatedWaitMinutes: estimateWaitMinutes(ahead, duration),
    };
  }
}
