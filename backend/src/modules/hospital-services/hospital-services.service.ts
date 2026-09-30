import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { FileStorageService } from '../../core/file-storage/file-storage.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { ParsedMultipartFile } from '../../common/utils/multipart.util';
import { CreateHospitalServiceDto } from './dto/create-hospital-service.dto';
import { UpdateHospitalServiceDto } from './dto/update-hospital-service.dto';

const STORAGE_ENTITY = 'hospital-services';

@Injectable()
export class HospitalServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
    private readonly fileStorage: FileStorageService,
  ) {}

  async list(hospitalId?: number) {
    return this.prisma.hospitalService.findMany({
      where: hospitalId ? { hospitalId: BigInt(hospitalId) } : undefined,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: bigint) {
    const service = await this.prisma.hospitalService.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Hospital service not found');
    }
    return service;
  }

  async create(user: AuthenticatedUser, dto: CreateHospitalServiceDto, file?: ParsedMultipartFile) {
    const hospitalId = BigInt(dto.hospitalId);
    await this.assertHospitalOwnerOrAdmin(hospitalId, user);

    const service = await this.prisma.hospitalService.create({
      data: {
        hospitalId,
        name: dto.name,
        description: dto.description,
      },
    });

    if (!file) {
      return service;
    }

    // Keyed by the service's own id, so a later update/delete only touches
    // this service's file, not any other service belonging to the hospital.
    const stored = await this.fileStorage.store(STORAGE_ENTITY, service.id.toString(), file.filename, file.buffer);
    return this.prisma.hospitalService.update({
      where: { id: service.id },
      data: { image: stored.relativePath },
    });
  }

  async update(
    id: bigint,
    user: AuthenticatedUser,
    dto: UpdateHospitalServiceDto,
    file?: ParsedMultipartFile,
  ) {
    const service = await this.findOne(id);
    await this.assertHospitalOwnerOrAdmin(service.hospitalId, user);

    let image = service.image;
    if (file) {
      await this.fileStorage.deleteDirectory(STORAGE_ENTITY, id);
      const stored = await this.fileStorage.store(STORAGE_ENTITY, id.toString(), file.filename, file.buffer);
      image = stored.relativePath;
    }

    return this.prisma.hospitalService.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        image,
      },
    });
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    const service = await this.findOne(id);
    await this.assertHospitalOwnerOrAdmin(service.hospitalId, user);

    await this.prisma.hospitalService.delete({ where: { id } });
    await this.fileStorage.deleteDirectory(STORAGE_ENTITY, id);
    return { message: 'Hospital service deleted' };
  }

  private async assertHospitalOwnerOrAdmin(hospitalId: bigint, user: AuthenticatedUser): Promise<void> {
    await this.access.assertCanManage(hospitalId, user);
  }
}
