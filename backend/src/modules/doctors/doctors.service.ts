import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { formatHHMM, groupByWeekday, minutesOfTime, parseSchedule } from './schedule.util';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

// Never select the password hash when returning the linked user.
const DOCTOR_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
} as const;

@Injectable()
export class DoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
  ) {}

  async findAll(user: AuthenticatedUser, hospitalIdParam?: number) {
    const isAdmin = user.roles.includes('admin');
    const isHospital = user.roles.includes('hospital');

    let hospitalId: bigint | undefined;
    if (hospitalIdParam !== undefined) {
      // Explicit filter - anyone can browse a specific hospital's doctors.
      hospitalId = BigInt(hospitalIdParam);
    } else if (isAdmin) {
      hospitalId = undefined; // admin sees all
    } else if (isHospital) {
      const hospital = await this.access.activeHospital(user);
      if (!hospital) {
        throw new NotFoundException('You do not have a hospital');
      }
      hospitalId = hospital.id;
    } else {
      throw new BadRequestException('hospitalId query parameter is required');
    }

    return this.prisma.doctor.findMany({
      where: hospitalId !== undefined ? { hospitalId } : undefined,
      include: {
        user: { select: DOCTOR_USER_SELECT },
        hospital: { select: { id: true, name: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: bigint) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: { select: DOCTOR_USER_SELECT },
        hospital: true,
      },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    return doctor;
  }

  // IMPROVEMENT vs. the original DoctorController::store: the linked User
  // (role 'doctor') and the Doctor row are created inside one
  // $transaction, so a failure partway through can't leave an orphaned
  // User account with no Doctor profile (see MIGRATION_ROADMAP.md).
  async create(user: AuthenticatedUser, dto: CreateDoctorDto) {
    // Throws 404 for an unknown hospital and 403 unless the caller manages it.
    const hospital = await this.access.assertCanManage(BigInt(dto.hospitalId), user);

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const role = await this.prisma.role.findFirst({ where: { name: 'doctor' } });
    if (!role) {
      throw new BadRequestException('Role "doctor" is not seeded');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          name: `${dto.firstName} ${dto.lastName}`,
          email: dto.email,
          password: passwordHash,
          phone: dto.phone,
          roles: { create: { roleId: role.id } },
        },
      });

      return tx.doctor.create({
        data: {
          userId: newUser.id,
          hospitalId: hospital.id,
          response: dto.response,
        },
        include: { user: { select: DOCTOR_USER_SELECT } },
      });
    });
  }

  async update(id: bigint, user: AuthenticatedUser, dto: UpdateDoctorDto) {
    const doctor = await this.getDoctorOrThrow(id);
    await this.assertCanManage(doctor, user, { allowSelf: true });

    return this.prisma.$transaction(async (tx) => {
      if (dto.firstName !== undefined || dto.lastName !== undefined || dto.phone !== undefined) {
        await tx.user.update({
          where: { id: doctor.userId },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            name:
              dto.firstName !== undefined || dto.lastName !== undefined
                ? `${dto.firstName ?? doctor.user.firstName ?? ''} ${
                    dto.lastName ?? doctor.user.lastName ?? ''
                  }`.trim()
                : undefined,
          },
        });
      }

      return tx.doctor.update({
        where: { id },
        data: { response: dto.response },
        include: { user: { select: DOCTOR_USER_SELECT } },
      });
    });
  }

  // Doctor.userId -> User has onDelete: Cascade (deleting the User cascades
  // to the Doctor row, not the other way around), so removing a doctor
  // fully means deleting the User - prisma.doctor.delete() alone would
  // leave an orphaned doctor-role User account with no Doctor profile.
  async remove(id: bigint, user: AuthenticatedUser) {
    const doctor = await this.getDoctorOrThrow(id);
    await this.assertCanManage(doctor, user, { allowSelf: false });

    await this.prisma.user.delete({ where: { id: doctor.userId } });
    return { message: 'Doctor deleted' };
  }

  // Any signed-in user may read a doctor's hours (patients see them when booking).
  async getSchedule(id: bigint) {
    await this.getDoctorOrThrow(id);
    const rows = await this.prisma.doctorSchedule.findMany({ where: { doctorId: id } });
    return { doctorId: id, days: groupByWeekday(rows) };
  }

  // Replaces the whole week. The hospital's managers or the doctor themself may
  // edit it. Hours must sit inside the hospital's opening hours (when it has
  // them) - otherwise the booking check would refuse them anyway.
  async setSchedule(id: bigint, user: AuthenticatedUser, days: unknown) {
    const doctor = await this.getDoctorOrThrow(id);
    await this.assertCanManage(doctor, user, { allowSelf: true });

    const rows = parseSchedule(days);
    const { openTime, closeTime } = doctor.hospital;
    if (openTime && closeTime) {
      const open = minutesOfTime(openTime);
      const close = minutesOfTime(closeTime);
      for (const r of rows) {
        if (minutesOfTime(r.start) < open || minutesOfTime(r.end) > close) {
          throw new BadRequestException(
            `Working hours must be inside the hospital's opening hours (${formatHHMM(open)}-${formatHHMM(close)})`,
          );
        }
      }
    }

    await this.prisma.$transaction([
      this.prisma.doctorSchedule.deleteMany({ where: { doctorId: id } }),
      this.prisma.doctorSchedule.createMany({
        data: rows.map((r) => ({ doctorId: id, weekday: r.weekday, startTime: r.start, endTime: r.end })),
      }),
    ]);
    return this.getSchedule(id);
  }

  private async getDoctorOrThrow(id: bigint) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: { hospital: true, user: true },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    return doctor;
  }

  private async assertCanManage(
    doctor: { hospitalId: bigint; userId: bigint },
    user: AuthenticatedUser,
    { allowSelf }: { allowSelf: boolean },
  ) {
    const isSelf = allowSelf && doctor.userId === user.id;

    if (!isSelf && !(await this.access.canManage(doctor.hospitalId, user))) {
      throw new ForbiddenException('You do not have access to this doctor');
    }
  }
}
