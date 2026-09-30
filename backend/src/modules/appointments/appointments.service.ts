import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { manageableHospitalWhere } from '../../core/access/hospital-access';
import { NotificationsGateway } from '../../core/websocket/notifications.gateway';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { AppointmentMailer } from './appointment-mailer';
import { queueLabel } from './check-in.util';
import {
  clipIntervals,
  describeIntervals,
  intervalsFor,
  isWithinIntervals,
  weekdayOf,
} from '../doctors/schedule.util';
import {
  buildSlots,
  formatMinutes,
  isInPast,
  isWithinHours,
  minutesOf,
  overlaps,
  resolveRange,
  slotMinutes,
  wallClockNow,
} from './availability.util';

// Statuses that occupy a doctor's time. Canceled/Rejected/Missing free the slot.
const BUSY_STATUSES = [
  AppointmentStatus.Pending,
  AppointmentStatus.Confirmed,
  AppointmentStatus.Arrived,
  AppointmentStatus.Completed,
];

// Once a patient has checked in, only the check-in flow moves the appointment on.
const IN_PROGRESS_OR_DONE: AppointmentStatus[] = [AppointmentStatus.Arrived, AppointmentStatus.Completed];

// User fields safe to embed in appointment responses - excludes `password`.
// `include: { user: true }` would otherwise leak the patient's password hash
// (BigIntInterceptor only stringifies bigints, it doesn't strip fields).
const SAFE_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  name: true,
  email: true,
  phone: true,
  profile: true,
} satisfies Prisma.UserSelect;

const APPOINTMENT_INCLUDE = {
  hospital: true,
  doctor: { include: { user: { select: SAFE_USER_SELECT } } },
  room: true,
  user: { select: SAFE_USER_SELECT },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithScopeRelations = Prisma.AppointmentGetPayload<{
  include: { hospital: true; doctor: true };
}>;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly mailer: AppointmentMailer,
    private readonly access: HospitalAccessService,
  ) {}

  async list(user: AuthenticatedUser, query: QueryAppointmentsDto) {
    const where: Prisma.AppointmentWhereInput = { ...this.roleScopeWhere(user) };
    if (query.status) where.status = query.status;
    if (query.hospitalId) where.hospitalId = BigInt(query.hospitalId);
    if (query.doctorId) where.doctorId = BigInt(query.doctorId);
    if (query.date) where.appointmentDate = new Date(query.date);

    const rows = await this.prisma.appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDE,
      orderBy: [{ appointmentDate: 'desc' }, { appointmentTime: 'desc' }],
    });
    return rows.map((row) => this.mapFlat(row));
  }

  async findOne(user: AuthenticatedUser, id: bigint) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (!(await this.canView(user, appointment))) {
      throw new ForbiddenException('You do not have access to this appointment');
    }
    return this.mapFlat(appointment);
  }

  async create(user: AuthenticatedUser, dto: CreateAppointmentDto) {
    const isDoctorCaller = user.roles.includes('doctor');

    let hospitalId: bigint;
    let doctorId: bigint;
    let targetUserId: bigint;

    if (isDoctorCaller) {
      // Doctor creating an appointment on a patient's behalf - never trust
      // client-supplied doctorId/hospitalId for who the doctor is, resolve
      // it from the caller's own doctor row instead (same lookup pattern as
      // monthly() above).
      const ownDoctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!ownDoctor) throw new ForbiddenException('No doctor profile for this account');
      if (!dto.userId) throw new BadRequestException('userId (patient) is required');

      const targetUser = await this.prisma.user.findUnique({ where: { id: BigInt(dto.userId) } });
      if (!targetUser) throw new NotFoundException('Patient not found');

      hospitalId = ownDoctor.hospitalId;
      doctorId = ownDoctor.id;
      targetUserId = targetUser.id;
    } else {
      if (!dto.hospitalId || !dto.doctorId) {
        throw new BadRequestException('hospitalId and doctorId are required');
      }
      hospitalId = BigInt(dto.hospitalId);
      doctorId = BigInt(dto.doctorId);
      targetUserId = user.id;
    }

    const roomId = dto.roomId ? BigInt(dto.roomId) : undefined;

    const [hospital, doctor] = await Promise.all([
      this.prisma.hospital.findUnique({ where: { id: hospitalId } }),
      this.prisma.doctor.findUnique({ where: { id: doctorId } }),
    ]);
    if (!hospital) throw new NotFoundException('Hospital not found');
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.hospitalId !== hospitalId) {
      throw new BadRequestException('Doctor does not belong to the given hospital');
    }
    if (roomId) {
      const room = await this.prisma.room.findUnique({ where: { id: roomId } });
      if (!room || room.hospitalId !== hospitalId) {
        throw new BadRequestException('Room does not belong to the given hospital');
      }
    }

    const appointmentDate = this.startOfUtcDate(new Date(dto.appointmentDate));
    const appointmentTime = this.parseTime(dto.appointmentTime);
    const appointmentEnd = dto.appointmentEnd ? this.parseTime(dto.appointmentEnd) : null;

    // Check + insert under a per-doctor row lock so two simultaneous requests
    // for the same slot can't both pass the check.
    const appointment = await this.prisma.$transaction(async (tx) => {
      await this.assertSlotFree(tx, {
        hospital,
        doctorId,
        date: appointmentDate,
        time: appointmentTime,
        end: appointmentEnd,
      });
      return tx.appointment.create({
        data: {
          title: dto.title,
          userId: targetUserId,
          hospitalId,
          doctorId,
          roomId,
          appointmentDate,
          appointmentTime,
          appointmentEnd: appointmentEnd ?? undefined,
        },
        include: APPOINTMENT_INCLUDE,
      });
    });

    void this.mailer.requested(appointment);

    // Notify everyone tied to this appointment except whoever just created
    // it: a patient booking notifies hospital+doctor (unchanged); a doctor
    // booking on a patient's behalf notifies hospital+patient instead.
    const hospitalRecipients = await this.access.notificationRecipientIds(hospital);
    const interestedParties = [...hospitalRecipients, doctor.userId, appointment.userId];
    const recipients = [...new Set(interestedParties.map(String))]
      .map((id) => BigInt(id))
      .filter((id) => id !== user.id);

    await this.createAppointmentPlacedNotifications(
      appointment.id,
      appointment.title,
      hospital.name,
      recipients,
      user.id,
    );

    this.gateway.emitAppointmentPlaced(recipients, {
      appointmentId: appointment.id.toString(),
      title: appointment.title,
      hospitalId: appointment.hospitalId.toString(),
      doctorId: appointment.doctorId.toString(),
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      status: appointment.status,
    });

    return this.mapFlat(appointment);
  }

  // Free/busy grid for one doctor on one day. Exposes only times, never who
  // booked - safe for any authenticated user (patients use it to pick a slot).
  async availability(doctorId: bigint, dateStr: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { hospital: true, schedule: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const date = this.startOfUtcDate(new Date(dateStr));
    const existing = await this.prisma.appointment.findMany({
      where: { doctorId, appointmentDate: date, status: { in: BUSY_STATUSES } },
      select: { appointmentTime: true, appointmentEnd: true },
    });
    const busy = existing.map((e) => resolveRange(e.appointmentTime, e.appointmentEnd));

    const now = wallClockNow();
    const today = this.startOfUtcDate(now).getTime();
    const pastBefore = date.getTime() < today ? 24 * 60 : date.getTime() === today ? minutesOf(now) : undefined;
    const { openTime, closeTime } = doctor.hospital;

    // Working windows for that weekday: the doctor's own hours (clipped to the
    // hospital's) when they have a schedule, else the hospital's hours. A day
    // off is an empty list, so there are no slots.
    const hospitalOpen = openTime ? minutesOf(openTime) : null;
    const hospitalClose = closeTime ? minutesOf(closeTime) : null;
    const windows = doctor.schedule.length
      ? clipIntervals(intervalsFor(doctor.schedule, weekdayOf(date)), hospitalOpen, hospitalClose)
      : [{ start: hospitalOpen ?? 8 * 60, end: hospitalClose ?? 17 * 60 }];

    return {
      doctorId: doctor.id,
      date: date.toISOString().slice(0, 10),
      slotMinutes: slotMinutes(),
      open: openTime ? formatMinutes(minutesOf(openTime)) : null,
      close: closeTime ? formatMinutes(minutesOf(closeTime)) : null,
      busy: busy.map(([start, end]) => ({ start: formatMinutes(start), end: formatMinutes(end) })),
      hasSchedule: doctor.schedule.length > 0,
      slots: buildSlots(windows, busy, slotMinutes(), pastBefore),
    };
  }

  // Rejects bookings that start in the past, fall outside the hospital's
  // opening hours, or overlap another Pending/Confirmed booking of the same
  // doctor. Must run inside the transaction that writes the appointment: it
  // takes a row lock on the doctor to serialize concurrent bookings.
  private async assertSlotFree(
    tx: Prisma.TransactionClient,
    p: {
      hospital: { openTime: Date | null; closeTime: Date | null };
      doctorId: bigint;
      date: Date;
      time: Date;
      end?: Date | null;
      excludeId?: bigint;
    },
  ) {
    const range = resolveRange(p.time, p.end);
    if (range[1] <= range[0]) {
      throw new BadRequestException('appointmentEnd must be after appointmentTime');
    }
    if (isInPast(p.date, p.time)) {
      throw new BadRequestException('Appointments cannot be booked in the past');
    }
    if (!isWithinHours(p.hospital.openTime, p.hospital.closeTime, range)) {
      const open = formatMinutes(minutesOf(p.hospital.openTime as Date));
      const close = formatMinutes(minutesOf(p.hospital.closeTime as Date));
      throw new BadRequestException(`Outside the hospital's opening hours (${open} - ${close})`);
    }

    // The doctor's own weekly hours (none = follows the hospital's, checked above).
    const schedule = await tx.doctorSchedule.findMany({ where: { doctorId: p.doctorId } });
    if (schedule.length) {
      const today = intervalsFor(schedule, weekdayOf(p.date));
      if (!today.length) {
        throw new BadRequestException('This doctor does not work on that day');
      }
      if (!isWithinIntervals(today, range)) {
        throw new BadRequestException(`This doctor works ${describeIntervals(today)} on that day`);
      }
    }

    await tx.$queryRaw`SELECT id FROM doctors WHERE id = ${p.doctorId} FOR UPDATE`;
    const others = await tx.appointment.findMany({
      where: {
        doctorId: p.doctorId,
        appointmentDate: p.date,
        status: { in: BUSY_STATUSES },
        ...(p.excludeId ? { id: { not: p.excludeId } } : {}),
      },
      select: { appointmentTime: true, appointmentEnd: true },
    });
    if (others.some((o) => overlaps(range, resolveRange(o.appointmentTime, o.appointmentEnd)))) {
      throw new ConflictException('This doctor is already booked at that time. Please choose another slot.');
    }
  }

  // Patient picker for the doctor "new appointment" flow. Deliberately loose
  // (no per-caller ownership scoping) - a doctor only ever picks a patient
  // to attach to a fresh appointment they're creating, there's no existing
  // record to check ownership against yet. `@Roles('doctor')` on the
  // controller route is the access boundary here.
  async searchPatients(q: string) {
    const query = (q ?? '').trim();
    if (!query) return [];

    // HTTP response - BigIntInterceptor (registered globally in main.ts)
    // stringifies `id` on the way out, no manual conversion needed here.
    return this.prisma.user.findMany({
      where: {
        roles: { some: { role: { name: 'user' } } },
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { name: { contains: query } },
          { phone: { contains: query } },
        ],
      },
      select: SAFE_USER_SELECT,
      take: 10,
    });
  }

  async update(user: AuthenticatedUser, id: bigint, dto: UpdateAppointmentDto) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const isAdmin = user.roles.includes('admin');
    const isOwner = appointment.userId === user.id;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Not allowed to update this appointment');
    }
    if (appointment.status !== AppointmentStatus.Pending) {
      throw new BadRequestException('Only pending appointments can be updated');
    }

    let roomId: bigint | null | undefined;
    if (dto.roomId !== undefined) {
      roomId = dto.roomId ? BigInt(dto.roomId) : null;
      if (roomId) {
        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room || room.hospitalId !== appointment.hospitalId) {
          throw new BadRequestException("Room does not belong to this appointment's hospital");
        }
      }
    }

    const timingChanged =
      dto.appointmentDate !== undefined || dto.appointmentTime !== undefined || dto.appointmentEnd !== undefined;
    const nextDate = dto.appointmentDate
      ? this.startOfUtcDate(new Date(dto.appointmentDate))
      : appointment.appointmentDate;
    const nextTime = dto.appointmentTime ? this.parseTime(dto.appointmentTime) : appointment.appointmentTime;
    const nextEnd =
      dto.appointmentEnd !== undefined
        ? dto.appointmentEnd
          ? this.parseTime(dto.appointmentEnd)
          : null
        : appointment.appointmentEnd;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (timingChanged) {
        const hospital = await tx.hospital.findUniqueOrThrow({ where: { id: appointment.hospitalId } });
        await this.assertSlotFree(tx, {
          hospital,
          doctorId: appointment.doctorId,
          date: nextDate,
          time: nextTime,
          end: nextEnd,
          excludeId: id,
        });
      }
      return tx.appointment.update({
        where: { id },
        data: {
          title: dto.title,
          appointmentDate: dto.appointmentDate ? nextDate : undefined,
          appointmentTime: dto.appointmentTime ? nextTime : undefined,
          appointmentEnd: dto.appointmentEnd !== undefined ? nextEnd : undefined,
          roomId,
          // A rescheduled appointment gets a fresh reminder.
          reminderSentAt: timingChanged ? null : undefined,
        },
        include: APPOINTMENT_INCLUDE,
      });
    });
    return this.mapFlat(updated);
  }

  async updateStatus(user: AuthenticatedUser, id: bigint, dto: UpdateAppointmentStatusDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { hospital: true, doctor: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const isAdmin = user.roles.includes('admin');
    if (dto.target === 'hospital') {
      const isOwningHospital =
        user.roles.includes('hospital') && (await this.access.canManage(appointment.hospitalId, user));
      if (!isAdmin && !isOwningHospital) {
        throw new ForbiddenException('Not allowed to set the hospital status for this appointment');
      }
    } else {
      const isOwningDoctor = user.roles.includes('doctor') && appointment.doctor.userId === user.id;
      if (!isAdmin && !isOwningDoctor) {
        throw new ForbiddenException('Not allowed to set the doctor status for this appointment');
      }
    }

    if (IN_PROGRESS_OR_DONE.includes(appointment.status)) {
      throw new BadRequestException('This appointment is already in progress or finished.');
    }
    if (IN_PROGRESS_OR_DONE.includes(dto.status)) {
      throw new BadRequestException('Use check-in / complete for that.');
    }

    const previousStatus = appointment.status;
    const hospitalStatus = dto.target === 'hospital' ? dto.status : appointment.hospitalStatus;
    const doctorStatus = dto.target === 'doctor' ? dto.status : appointment.doctorStatus;
    const newOverallStatus = this.convergeStatus(hospitalStatus, doctorStatus);

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { hospitalStatus, doctorStatus, status: newOverallStatus },
      include: APPOINTMENT_INCLUDE,
    });

    // Only notify/broadcast when this update actually moved the overall
    // status to a new value - re-confirming an already-converged status
    // (e.g. re-submitting the same target status) shouldn't spam the patient.
    if (newOverallStatus !== previousStatus) {
      void this.mailer.status(updated, newOverallStatus);
      const notificationType = this.resolveConvergedNotificationType(
        hospitalStatus,
        doctorStatus,
        newOverallStatus,
      );
      if (notificationType) {
        await this.prisma.appointmentNotification.create({
          data: {
            userId: appointment.userId,
            appointmentId: appointment.id,
            fromUserId: user.id,
            type: notificationType,
            message: `Your appointment "${appointment.title}" at ${appointment.hospital.name} is now ${newOverallStatus}.`,
          },
        });

        const payload = {
          appointmentId: appointment.id.toString(),
          status: newOverallStatus,
          hospitalStatus,
          doctorStatus,
        };
        this.gateway.emitAppointmentStatusChanged(appointment.userId, payload);
        this.gateway.emitNotification(appointment.userId, {
          type: notificationType,
          appointmentId: appointment.id.toString(),
          message: payload,
        });
      }
    }

    return this.mapFlat(updated);
  }

  // Backs the `/appointments/update-status/:id` alias - the frontend never
  // sends `target` (it doesn't distinguish hospital vs. doctor client-side),
  // so this infers it from the caller's own role instead of requiring the
  // client to know. Also accepts an optional roomId so the doctor's
  // "assign room and confirm" flow can do both in one call.
  async updateStatusForCaller(
    user: AuthenticatedUser,
    id: bigint,
    body: { status: string; roomId?: string; room_id?: string },
  ) {
    const roomId = body.roomId ?? body.room_id;
    if (roomId) {
      const appointment = await this.prisma.appointment.findUnique({ where: { id } });
      if (!appointment) throw new NotFoundException('Appointment not found');
      const room = await this.prisma.room.findUnique({ where: { id: BigInt(roomId) } });
      if (!room || room.hospitalId !== appointment.hospitalId) {
        throw new BadRequestException("Room does not belong to this appointment's hospital");
      }
      await this.prisma.appointment.update({ where: { id }, data: { roomId: BigInt(roomId) } });
    }

    const target: 'hospital' | 'doctor' = user.roles.includes('hospital') ? 'hospital' : 'doctor';
    const settable = Object.values(AppointmentStatus).filter((status) => !IN_PROGRESS_OR_DONE.includes(status));
    if (!settable.includes(body.status as AppointmentStatus)) {
      throw new BadRequestException(`status must be one of: ${settable.join(', ')}`);
    }
    return this.updateStatus(user, id, { target, status: body.status as AppointmentStatus });
  }

  async cancel(user: AuthenticatedUser, id: bigint) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { hospital: true, doctor: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const isAdmin = user.roles.includes('admin');
    const isOwner = appointment.userId === user.id;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Not allowed to cancel this appointment');
    }
    if (IN_PROGRESS_OR_DONE.includes(appointment.status)) {
      throw new BadRequestException('An appointment cannot be canceled after check-in.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.Canceled },
      include: APPOINTMENT_INCLUDE,
    });

    void this.mailer.status(updated, AppointmentStatus.Canceled);

    const recipientIds = [
      ...new Set([...(await this.access.notificationRecipientIds(appointment.hospital)), appointment.doctor.userId]),
    ];
    for (const recipientId of recipientIds) {
      await this.prisma.appointmentNotification.create({
        data: {
          userId: recipientId,
          appointmentId: appointment.id,
          fromUserId: user.id,
          type: NotificationType.Appointment_Cancel,
          message: `Appointment "${appointment.title}" at ${appointment.hospital.name} was canceled by the patient.`,
        },
      });
      this.gateway.emitNotification(recipientId, {
        type: NotificationType.Appointment_Cancel,
        appointmentId: appointment.id.toString(),
      });
    }

    this.gateway.emitAppointmentStatusChanged(appointment.userId, {
      appointmentId: appointment.id.toString(),
      status: updated.status,
    });

    return this.mapFlat(updated);
  }

  async remove(id: bigint) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    await this.prisma.appointment.delete({ where: { id } });
    return { message: 'Appointment deleted' };
  }

  // Two frontend consumers read different shapes off this one endpoint -
  // the hospital dashboard reads .pending/.confirm, the doctor dashboard
  // reads .today/.missing/.confirmed. Returns every field either expects
  // instead of picking one and breaking the other.
  async summary(user: AuthenticatedUser) {
    const where = this.roleScopeWhere(user);
    const [rows, todayCount] = await Promise.all([
      this.prisma.appointment.groupBy({ by: ['status'], _count: true, where }),
      (async () => {
        const start = this.startOfUtcDate(new Date());
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        return this.prisma.appointment.count({
          where: { ...where, appointmentDate: { gte: start, lt: end } },
        });
      })(),
    ]);

    const counts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      canceled: 0,
      rejected: 0,
      missing: 0,
      arrived: 0,
      completed: 0,
    };
    for (const row of rows) {
      counts[row.status.toLowerCase()] = row._count;
    }

    return {
      ...counts,
      confirm: counts.confirmed,
      today: todayCount,
    };
  }

  // Today's working list for reception and doctors: who is waiting (in check-in
  // order), who is still expected (by appointment time), and who is done.
  async queue(user: AuthenticatedUser) {
    const today = this.startOfUtcDate(wallClockNow());
    const rows = await this.prisma.appointment.findMany({
      where: {
        ...this.roleScopeWhere(user),
        appointmentDate: today,
        status: {
          in: [
            AppointmentStatus.Arrived,
            AppointmentStatus.Confirmed,
            AppointmentStatus.Completed,
            AppointmentStatus.Missing,
          ],
        },
      },
      include: APPOINTMENT_INCLUDE,
    });

    const rank: Record<string, number> = { Arrived: 0, Confirmed: 1, Completed: 2, Missing: 3 };
    const items = rows
      .map((row) => this.mapFlat(row))
      .sort(
        (a, b) =>
          rank[a.status] - rank[b.status] ||
          (a.status === AppointmentStatus.Arrived
            ? (a.queue_number ?? 0) - (b.queue_number ?? 0)
            : String(a.appointment_time).localeCompare(String(b.appointment_time))),
      );

    const count = (status: AppointmentStatus) => rows.filter((r) => r.status === status).length;
    return {
      date: today.toISOString().slice(0, 10),
      counts: {
        waiting: count(AppointmentStatus.Arrived),
        expected: count(AppointmentStatus.Confirmed),
        completed: count(AppointmentStatus.Completed),
        missing: count(AppointmentStatus.Missing),
      },
      items,
    };
  }

  async today(user: AuthenticatedUser) {
    const where = this.roleScopeWhere(user);
    const start = this.startOfUtcDate(new Date());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const rows = await this.prisma.appointment.findMany({
      where: { ...where, appointmentDate: { gte: start, lt: end } },
      include: APPOINTMENT_INCLUDE,
      orderBy: { appointmentTime: 'asc' },
    });
    return rows.map((row) => this.mapFlat(row));
  }

  async calendar(user: AuthenticatedUser, month?: string, year?: string) {
    const now = new Date();
    const y = year ? Number(year) : now.getUTCFullYear();
    const m = month ? Number(month) : now.getUTCMonth() + 1;
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      throw new BadRequestException('month must be an integer between 1 and 12');
    }

    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    const where = this.roleScopeWhere(user);

    const rows = await this.prisma.appointment.findMany({
      where: { ...where, appointmentDate: { gte: start, lt: end } },
      include: APPOINTMENT_INCLUDE,
      orderBy: { appointmentDate: 'asc' },
    });
    return rows.map((row) => this.mapCalendarEvent(row));
  }

  // 12-month appointment counts, most recent month last. Prisma's `groupBy`
  // can't truncate a DATE column to month for MySQL, hence the raw query
  // (per MIGRATION_ROADMAP.md's guidance for the Rates "monthly" endpoint,
  // same shape applies here).
  async monthly(user: AuthenticatedUser) {
    let scopeSql = Prisma.sql``;
    if (user.roles.includes('admin')) {
      scopeSql = Prisma.sql``;
    } else if (user.roles.includes('hospital')) {
      const hospitalIds =
        user.activeHospitalId !== undefined ? [user.activeHospitalId] : await this.access.manageableHospitalIds(user);
      if (!hospitalIds.length) return this.fillMonthlyBuckets([]);
      scopeSql = Prisma.sql`AND hospital_id IN (${Prisma.join(hospitalIds)})`;
    } else if (user.roles.includes('doctor')) {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) return this.fillMonthlyBuckets([]);
      scopeSql = Prisma.sql`AND doctor_id = ${doctor.id}`;
    } else {
      scopeSql = Prisma.sql`AND user_id = ${user.id}`;
    }

    const rows = await this.prisma.$queryRaw<{ month: string; count: bigint | number }[]>(
      Prisma.sql`
        SELECT DATE_FORMAT(appointment_date, '%Y-%m') AS month, COUNT(*) AS count
        FROM appointments
        WHERE appointment_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
        ${scopeSql}
        GROUP BY month
        ORDER BY month ASC
      `,
    );

    return this.fillMonthlyBuckets(rows);
  }

  // ---------------------------------------------------------------------
  // Status convergence
  // ---------------------------------------------------------------------

  // The hospital and the doctor each set their own status field
  // independently; the overall `status` must converge to reflect both. This
  // is a best-effort reconstruction of the original Laravel
  // ConfirmAppointmentListener's intent - the exact original logic could not
  // be recovered (app deleted from the repo; see MIGRATION_ROADMAP.md
  // "Known bugs / drift": the listener only handled the
  // both-reached-the-same-terminal-state case inconsistently, and a
  // `BroadcastAs` typo meant status-change broadcasts never actually fired
  // in production). Implemented here as an explicit, synchronous method
  // called right after any hospitalStatus/doctorStatus write, rather than an
  // event/listener chain, to avoid the recursion risk that chain carried.
  //
  // Rule:
  //  - both Confirmed              -> Confirmed
  //  - either Canceled or Rejected -> Canceled
  //  - otherwise                   -> Pending
  private convergeStatus(
    hospitalStatus: AppointmentStatus,
    doctorStatus: AppointmentStatus,
  ): AppointmentStatus {
    if (hospitalStatus === AppointmentStatus.Confirmed && doctorStatus === AppointmentStatus.Confirmed) {
      return AppointmentStatus.Confirmed;
    }
    if (
      hospitalStatus === AppointmentStatus.Canceled ||
      hospitalStatus === AppointmentStatus.Rejected ||
      doctorStatus === AppointmentStatus.Canceled ||
      doctorStatus === AppointmentStatus.Rejected
    ) {
      return AppointmentStatus.Canceled;
    }
    return AppointmentStatus.Pending;
  }

  private resolveConvergedNotificationType(
    hospitalStatus: AppointmentStatus,
    doctorStatus: AppointmentStatus,
    newOverallStatus: AppointmentStatus,
  ): NotificationType | null {
    if (newOverallStatus === AppointmentStatus.Confirmed) {
      return NotificationType.Appointment_Accepted;
    }
    if (newOverallStatus === AppointmentStatus.Canceled) {
      const rejected =
        hospitalStatus === AppointmentStatus.Rejected || doctorStatus === AppointmentStatus.Rejected;
      return rejected ? NotificationType.Appointment_Rejected : NotificationType.Appointment_Cancel;
    }
    return null;
  }

  // Fix for the original NotifyToHospital listener bug (see
  // MIGRATION_ROADMAP.md): both duplicate-prevention checks compared against
  // the same lookup, so duplicate-prevention only actually worked for one of
  // the two recipients. Fixed here by scoping each check to its own
  // recipient's userId before inserting that recipient's row.
  private async createAppointmentPlacedNotifications(
    appointmentId: bigint,
    appointmentTitle: string,
    hospitalName: string,
    recipients: bigint[],
    actingUserId: bigint,
  ) {
    for (const recipientId of recipients) {
      const existing = await this.prisma.appointmentNotification.findFirst({
        where: {
          appointmentId,
          userId: recipientId,
          type: NotificationType.New_Appointment_Added,
        },
      });
      if (!existing) {
        await this.prisma.appointmentNotification.create({
          data: {
            userId: recipientId,
            appointmentId,
            fromUserId: actingUserId,
            type: NotificationType.New_Appointment_Added,
            message: `New appointment "${appointmentTitle}" has been placed at ${hospitalName}.`,
          },
        });
      }
    }
  }

  // ---------------------------------------------------------------------
  // Role-based visibility scoping
  // ---------------------------------------------------------------------

  private roleScopeWhere(user: AuthenticatedUser): Prisma.AppointmentWhereInput {
    if (user.roles.includes('admin')) return {};
    if (user.roles.includes('hospital')) {
      return user.activeHospitalId !== undefined
        ? { hospitalId: user.activeHospitalId }
        : { hospital: manageableHospitalWhere(user.id) };
    }
    if (user.roles.includes('doctor')) return { doctor: { userId: user.id } };
    return { userId: user.id };
  }

  private async canView(user: AuthenticatedUser, appointment: AppointmentWithScopeRelations): Promise<boolean> {
    if (user.roles.includes('admin')) return true;
    if (user.roles.includes('hospital')) return this.access.canManage(appointment.hospitalId, user);
    if (user.roles.includes('doctor')) return appointment.doctor.userId === user.id;
    return appointment.userId === user.id;
  }

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------

  private parseTime(value: string): Date {
    const [h, m, s] = value.split(':');
    const hh = (h ?? '00').padStart(2, '0');
    const mm = (m ?? '00').padStart(2, '0');
    const ss = (s ?? '00').padStart(2, '0');
    return new Date(`1970-01-01T${hh}:${mm}:${ss}.000Z`);
  }

  // Frontend (never updated when this backend replaced the Laravel API)
  // reads a flat snake_case shape for tables/dialogs, and a FullCalendar
  // event shape (top-level id/title/start + extendedProps) for the three
  // calendar pages. Two mappers instead of one to match each consumer
  // exactly rather than forcing a shape neither fully wants. See API
  // contract alignment plan.
  private mapFlat(a: any) {
    return {
      id: a.id,
      title: a.title,
      appointment_date: a.appointmentDate,
      appointment_time: a.appointmentTime,
      appointment_end: a.appointmentEnd,
      status: a.status,
      hospital_status: a.hospitalStatus,
      doctor_status: a.doctorStatus,
      checked_in_at: a.checkedInAt ?? null,
      check_in_method: a.checkInMethod ?? null,
      queue_number: a.queueNumber ?? null,
      queue_prefix: a.queuePrefix ?? null,
      queue_label: queueLabel(a.queuePrefix, a.queueNumber),
      completed_at: a.completedAt ?? null,
      hospital: a.hospital?.name,
      hospital_id: a.hospitalId,
      doctor: a.doctor && {
        id: a.doctor.id,
        hospital_id: a.doctor.hospitalId,
        first_name: a.doctor.user?.firstName,
        last_name: a.doctor.user?.lastName,
      },
      room: a.room && { id: a.room.id, name: a.room.name },
      user: a.user && {
        id: a.user.id,
        first_name: a.user.firstName,
        last_name: a.user.lastName,
        name: a.user.name,
        phone_number: a.user.phone,
        profile: a.user.profile ?? 'No profile',
        gender: a.user.gender,
      },
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    };
  }

  private mapCalendarEvent(a: any) {
    return {
      id: a.id,
      title: a.title,
      // appointmentDate carries only the calendar day (UTC midnight);
      // appointmentTime/appointmentEnd carry only a wall-clock time on a
      // fixed 1970-01-01 epoch (see parseTime()). Combined here so
      // FullCalendar's week/day views position the event at its real time
      // instead of every appointment collapsing onto the midnight slot.
      start: this.combineDateAndTime(a.appointmentDate, a.appointmentTime),
      end: a.appointmentEnd ? this.combineDateAndTime(a.appointmentDate, a.appointmentEnd) : undefined,
      extendedProps: {
        appointment_time: a.appointmentTime,
        status: a.status,
        hospital_status: a.hospitalStatus,
        doctor_status: a.doctorStatus,
        hospital: a.hospital && { id: a.hospital.id, name: a.hospital.name },
        doctor: a.doctor && {
          id: a.doctor.id,
          hospital_id: a.doctor.hospitalId,
          first_name: a.doctor.user?.firstName,
          last_name: a.doctor.user?.lastName,
        },
        room: a.room && { id: a.room.id, name: a.room.name },
        user: a.user && {
          id: a.user.id,
          first_name: a.user.firstName,
          last_name: a.user.lastName,
          phone_number: a.user.phone,
          gender: a.user.gender,
        },
      },
    };
  }

  private combineDateAndTime(date: Date, time: Date): Date {
    const combined = new Date(date);
    combined.setUTCHours(time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), 0);
    return combined;
  }

  private startOfUtcDate(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private fillMonthlyBuckets(rows: { month: string; count: bigint | number }[]) {
    const counts = new Map(rows.map((row) => [row.month, Number(row.count)]));
    const now = new Date();
    const buckets: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      buckets.push({ month: key, count: counts.get(key) ?? 0 });
    }
    return buckets;
  }
}
