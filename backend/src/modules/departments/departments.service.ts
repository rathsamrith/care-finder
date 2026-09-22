import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { FileStorageService } from '../../core/file-storage/file-storage.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { ParsedMultipartFile } from '../../common/utils/multipart.util';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

const STORAGE_ENTITY = 'departments';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
    private readonly fileStorage: FileStorageService,
  ) {}

  async list(hospitalId?: number) {
    return this.prisma.department.findMany({
      where: hospitalId ? { hospitalId: BigInt(hospitalId) } : undefined,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: bigint) {
    const department = await this.prisma.department.findUnique({ where: { id } });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async create(user: AuthenticatedUser, dto: CreateDepartmentDto, file?: ParsedMultipartFile) {
    const hospitalId = BigInt(dto.hospitalId);
    await this.assertHospitalOwnerOrAdmin(hospitalId, user);

    const department = await this.prisma.department.create({
      data: {
        hospitalId,
        name: dto.name,
        details: dto.details,
      },
    });

    if (!file) {
      return department;
    }

    // The stored file is keyed by the department's own id, so a later
    // update/delete can replace or remove exactly this department's image
    // without touching any other department's files.
    const stored = await this.fileStorage.store(STORAGE_ENTITY, department.id.toString(), file.filename, file.buffer);
    return this.prisma.department.update({
      where: { id: department.id },
      data: { image: stored.relativePath },
    });
  }

  async update(id: bigint, user: AuthenticatedUser, dto: UpdateDepartmentDto, file?: ParsedMultipartFile) {
    const department = await this.findOne(id);
    await this.assertHospitalOwnerOrAdmin(department.hospitalId, user);

    let image = department.image;
    if (file) {
      await this.fileStorage.deleteDirectory(STORAGE_ENTITY, id);
      const stored = await this.fileStorage.store(STORAGE_ENTITY, id.toString(), file.filename, file.buffer);
      image = stored.relativePath;
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        details: dto.details,
        image,
      },
    });
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    const department = await this.findOne(id);
    await this.assertHospitalOwnerOrAdmin(department.hospitalId, user);

    await this.prisma.department.delete({ where: { id } });
    await this.fileStorage.deleteDirectory(STORAGE_ENTITY, id);
    return { message: 'Department deleted' };
  }

  private async assertHospitalOwnerOrAdmin(hospitalId: bigint, user: AuthenticatedUser): Promise<void> {
    await this.access.assertCanManage(hospitalId, user);
  }
}
