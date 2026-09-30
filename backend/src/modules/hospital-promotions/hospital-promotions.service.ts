import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { FileStorageService } from '../../core/file-storage/file-storage.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { ParsedMultipartFile } from '../../common/utils/multipart.util';
import { CreateHospitalPromotionDto } from './dto/create-hospital-promotion.dto';
import { UpdateHospitalPromotionDto } from './dto/update-hospital-promotion.dto';

const STORAGE_ENTITY = 'hospital-promotions';

@Injectable()
export class HospitalPromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
    private readonly fileStorage: FileStorageService,
  ) {}

  // Mirrors the original public `promotionlist()` route - promotions
  // currently in their active window, no auth required.
  async publicList() {
    const today = this.todayUtcDate();
    return this.prisma.hospitalPromotion.findMany({
      where: { startDate: { lte: today }, endDate: { gte: today } },
      include: { hospital: { select: { id: true, name: true, coverImage: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  // Same role-scoping shape as DoctorsService.findAll: an explicit
  // hospitalId query param is always honored (anyone can browse one
  // hospital's promotions), otherwise admins see everything and a hospital
  // owner sees their own; everyone else must pass hospitalId explicitly.
  async list(user: AuthenticatedUser, hospitalIdParam?: number) {
    const isAdmin = user.roles.includes('admin');
    const isHospital = user.roles.includes('hospital');

    let hospitalId: bigint | undefined;
    if (hospitalIdParam !== undefined) {
      hospitalId = BigInt(hospitalIdParam);
    } else if (isAdmin) {
      hospitalId = undefined;
    } else if (isHospital) {
      const hospital = await this.access.activeHospital(user);
      if (!hospital) {
        throw new NotFoundException('You do not have a hospital');
      }
      hospitalId = hospital.id;
    } else {
      throw new BadRequestException('hospitalId query parameter is required');
    }

    return this.prisma.hospitalPromotion.findMany({
      where: hospitalId !== undefined ? { hospitalId } : undefined,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: bigint) {
    const promotion = await this.prisma.hospitalPromotion.findUnique({ where: { id } });
    if (!promotion) {
      throw new NotFoundException('Hospital promotion not found');
    }
    return promotion;
  }

  async create(user: AuthenticatedUser, dto: CreateHospitalPromotionDto, file?: ParsedMultipartFile) {
    const hospitalId = BigInt(dto.hospitalId);
    await this.assertHospitalOwnerOrAdmin(hospitalId, user);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    this.assertDateRange(startDate, endDate);

    const promotion = await this.prisma.hospitalPromotion.create({
      data: {
        hospitalId,
        title: dto.title,
        description: dto.description,
        startDate,
        endDate,
      },
    });

    if (!file) {
      return promotion;
    }

    // Keyed by the promotion's own id, so a later update/delete only
    // touches this promotion's file, not any other promotion belonging to
    // the same hospital.
    const stored = await this.fileStorage.store(STORAGE_ENTITY, promotion.id.toString(), file.filename, file.buffer);
    return this.prisma.hospitalPromotion.update({
      where: { id: promotion.id },
      data: { image: stored.relativePath },
    });
  }

  async update(
    id: bigint,
    user: AuthenticatedUser,
    dto: UpdateHospitalPromotionDto,
    file?: ParsedMultipartFile,
  ) {
    const promotion = await this.findOne(id);
    await this.assertHospitalOwnerOrAdmin(promotion.hospitalId, user);

    const startDate = dto.startDate ? new Date(dto.startDate) : promotion.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : promotion.endDate;
    this.assertDateRange(startDate, endDate);

    let image = promotion.image;
    if (file) {
      await this.fileStorage.deleteDirectory(STORAGE_ENTITY, id);
      const stored = await this.fileStorage.store(STORAGE_ENTITY, id.toString(), file.filename, file.buffer);
      image = stored.relativePath;
    }

    return this.prisma.hospitalPromotion.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        startDate,
        endDate,
        image,
      },
    });
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    const promotion = await this.findOne(id);
    await this.assertHospitalOwnerOrAdmin(promotion.hospitalId, user);

    await this.prisma.hospitalPromotion.delete({ where: { id } });
    await this.fileStorage.deleteDirectory(STORAGE_ENTITY, id);
    return { message: 'Hospital promotion deleted' };
  }

  private assertDateRange(startDate: Date, endDate: Date): void {
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
  }

  private todayUtcDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private async assertHospitalOwnerOrAdmin(hospitalId: bigint, user: AuthenticatedUser): Promise<void> {
    await this.access.assertCanManage(hospitalId, user);
  }
}
