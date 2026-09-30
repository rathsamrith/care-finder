import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { FileStorageService } from '../../core/file-storage/file-storage.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';

// Anchors HH:mm[:ss] onto the epoch date - only the time-of-day part is
// read back out, since the column is Prisma @db.Time().
function toTimeDate(value: string | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const [hours, minutes, seconds] = value.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds || 0));
}

// Inverse of toTimeDate - formats the @db.Time() column back to "HH:mm"
// for display. Returns null rather than inventing a placeholder time.
function formatTime(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(11, 16);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

@Injectable()
export class HospitalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
    private readonly fileStorage: FileStorageService,
  ) {}

  async findAll() {
    // Browsable directory for any authenticated role - see route mapping
    // note in MIGRATION_ROADMAP.md ("Hospitals" was a public directory in
    // the original app, just gated behind login here).
    const hospitals = await this.prisma.hospital.findMany({
      include: {
        category: true,
        rates: { select: { star: true } },
        _count: { select: { previewImages: true } },
      },
      orderBy: { id: 'desc' },
    });
    return hospitals.map((hospital) => this.mapSummary(hospital));
  }

  async findOne(id: bigint) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
      include: {
        category: true,
        doctors: { include: { user: true } },
        departments: true,
        rooms: true,
        rates: { include: { user: true, replies: true }, orderBy: { createdAt: 'desc' } },
        appointments: { include: { user: { select: { id: true } } } },
      },
    });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }
    return this.mapDetail(hospital);
  }

  // A user's first hospital gets a new organization. Later ones become
  // branches of the organization they already own or administer, capped by
  // MAX_HOSPITALS_PER_ORG (default 5) so one account cannot mass-create listings.
  async create(userId: bigint, dto: CreateHospitalDto) {
    await this.assertCategoryExists(dto.categoryId);

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, role: { in: ['Owner', 'Admin'] } },
      orderBy: { id: 'asc' },
      include: { organization: { include: { _count: { select: { hospitals: true } } } } },
    });
    const limit = Number(process.env.MAX_HOSPITALS_PER_ORG) > 0 ? Number(process.env.MAX_HOSPITALS_PER_ORG) : 5;
    if (membership && membership.organization._count.hospitals >= limit) {
      throw new ConflictException(`An organization can have at most ${limit} hospitals`);
    }

    return this.prisma.hospital.create({
      data: {
        organization: membership
          ? { connect: { id: membership.organizationId } }
          : { create: { name: dto.name, members: { create: { userId, role: OrganizationRole.Owner } } } },
        name: dto.name,
        category: { connect: { id: BigInt(dto.categoryId) } },
        owner: { connect: { id: userId } },
        phoneNumber: dto.phoneNumber,
        streetAddress: dto.streetAddress,
        village: dto.village,
        commune: dto.commune,
        district: dto.district,
        province: dto.province,
        latitude: dto.latitude,
        longitude: dto.longitude,
        mission: dto.mission,
        vision: dto.vision,
        openTime: toTimeDate(dto.openTime),
        closeTime: toTimeDate(dto.closeTime),
      },
    });
  }

  async update(id: bigint, user: AuthenticatedUser, dto: UpdateHospitalDto) {
    await this.getOwnedOrThrow(id, user);
    if (dto.categoryId !== undefined) {
      await this.assertCategoryExists(dto.categoryId);
    }

    return this.prisma.hospital.update({
      where: { id },
      data: {
        name: dto.name,
        categoryId: dto.categoryId !== undefined ? BigInt(dto.categoryId) : undefined,
        phoneNumber: dto.phoneNumber,
        streetAddress: dto.streetAddress,
        village: dto.village,
        commune: dto.commune,
        district: dto.district,
        province: dto.province,
        latitude: dto.latitude,
        longitude: dto.longitude,
        mission: dto.mission,
        vision: dto.vision,
        openTime: toTimeDate(dto.openTime),
        closeTime: toTimeDate(dto.closeTime),
      },
    });
  }

  // Irreversible, so only an Owner may do it (a Manager/Admin can run the
  // hospital day to day but not delete it). Deleting an organization's last
  // hospital also removes the now-empty organization, its members and invites.
  async remove(id: bigint, user: AuthenticatedUser) {
    const hospital = await this.access.assertCanManage(id, user, 'Owner');
    await this.prisma.$transaction(async (tx) => {
      await tx.hospital.delete({ where: { id } });
      if (hospital.organizationId) {
        const remaining = await tx.hospital.count({ where: { organizationId: hospital.organizationId } });
        if (remaining === 0) await tx.organization.deleteMany({ where: { id: hospital.organizationId } });
      }
    });
    return { message: 'Hospital deleted' };
  }

  async addPreviewImage(id: bigint, user: AuthenticatedUser, filename: string, buffer: Buffer) {
    await this.getOwnedOrThrow(id, user);
    const stored = await this.fileStorage.store('hospitals/previews', id.toString(), filename, buffer);
    return this.prisma.previewImage.create({
      data: { hospitalId: id, imageName: stored.relativePath },
    });
  }

  async uploadCover(id: bigint, user: AuthenticatedUser, filename: string, buffer: Buffer) {
    await this.getOwnedOrThrow(id, user);
    const stored = await this.fileStorage.store('hospitals/covers', id.toString(), filename, buffer);
    return this.prisma.hospital.update({
      where: { id },
      data: { coverImage: stored.relativePath },
    });
  }

  // Prisma returns camelCase fields; the frontend (never updated when this
  // backend replaced the Laravel API) still expects the old snake_case
  // shape, plus a couple of computed/aliased fields (average_rating,
  // department, feedbacks, appointment) it reads directly off
  // hospitalDetail. See API contract alignment plan - these mappers are the
  // single place that reconciles the two instead of touching every
  // frontend call site.
  private mapSummary(hospital: any) {
    return {
      id: hospital.id,
      name: hospital.name,
      cover_image: this.fileStorage.resolveUrl(hospital.coverImage) ?? 'No Cover',
      phone_number: hospital.phoneNumber,
      street_address: hospital.streetAddress,
      village: hospital.village,
      commune: hospital.commune,
      district: hospital.district,
      province: hospital.province,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      open_time: formatTime(hospital.openTime),
      close_time: formatTime(hospital.closeTime),
      average_rating: hospital.rates ? average(hospital.rates.map((r: any) => r.star)) : 0,
      review_count: hospital.rates?.length ?? 0,
      photo_count: hospital._count?.previewImages ?? 0,
      category: hospital.category,
    };
  }

  private mapDetail(hospital: any) {
    return {
      ...this.mapSummary(hospital),
      street: hospital.streetAddress,
      mission: hospital.mission,
      vision: hospital.vision,
      doctors: (hospital.doctors ?? []).map((doctor: any) => ({
        id: doctor.id,
        first_name: doctor.user?.firstName,
        last_name: doctor.user?.lastName,
        profile: this.fileStorage.resolveUrl(doctor.user?.profile) ?? 'No profile',
        role: null,
      })),
      department: (hospital.departments ?? []).map((dep: any) => ({
        id: dep.id,
        name: dep.name,
        description: dep.details,
        image: this.fileStorage.resolveUrl(dep.image) ?? 'No profile',
      })),
      feedbacks: (hospital.rates ?? []).map((rate: any) => ({
        id: rate.id,
        content: rate.content,
        star: rate.star,
        created_at: rate.createdAt,
        user: { full_name: rate.user?.name },
        from: { profile: this.fileStorage.resolveUrl(rate.user?.profile) ?? 'No profile' },
        replies: (rate.replies ?? []).map((reply: any) => ({
          id: reply.id,
          content: reply.content,
          created_at: reply.createdAt,
          created_for: reply.createdAt,
        })),
      })),
      appointment: (hospital.appointments ?? []).map((appt: any) => ({
        id: appt.id,
        appointment_date: appt.appointmentDate,
        status: appt.status,
        user: { id: appt.user?.id },
      })),
      rooms: (hospital.rooms ?? []).map((room: any) => ({
        id: room.id,
        name: room.name,
        number_of_bed: room.numberOfBed,
      })),
    };
  }

  private async assertCategoryExists(categoryId: number) {
    const category = await this.prisma.category.findUnique({ where: { id: BigInt(categoryId) } });
    if (!category) {
      throw new BadRequestException(`Category ${categoryId} does not exist`);
    }
  }

  private getOwnedOrThrow(id: bigint, user: AuthenticatedUser) {
    return this.access.assertCanManage(id, user);
  }
}
