import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { FileStorageService } from '../../core/file-storage/file-storage.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { ParsedMultipartFile } from '../../common/utils/multipart.util';
import { CreatePreviewImagesDto } from './dto/create-preview-images.dto';

// Stored keyed by each PreviewImage row's own id (not the hospital's id),
// so replacing/deleting one preview image never touches any other preview
// image belonging to the same hospital. This is a flat CRUD resource
// distinct from HospitalsController's `POST /hospitals/:id/upload` (which
// adds a single preview image under a `hospitals/previews/{hospitalId}`
// path as a side effect of a different route - see MIGRATION_ROADMAP.md's
// route mapping table, both are legitimate, separately-owned endpoints).
const STORAGE_ENTITY = 'preview-images';

@Injectable()
export class PreviewImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
    private readonly fileStorage: FileStorageService,
  ) {}

  async list(hospitalId?: number) {
    return this.prisma.previewImage.findMany({
      where: hospitalId ? { hospitalId: BigInt(hospitalId) } : undefined,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: bigint) {
    const previewImage = await this.prisma.previewImage.findUnique({ where: { id } });
    if (!previewImage) {
      throw new NotFoundException('Preview image not found');
    }
    return previewImage;
  }

  // Mirrors the original PreviewImageController::store, which accepted an
  // array of images in one request and looped, creating one row per image.
  async createMany(user: AuthenticatedUser, dto: CreatePreviewImagesDto, files: ParsedMultipartFile[]) {
    const hospitalId = BigInt(dto.hospitalId);
    await this.assertHospitalOwnerOrAdmin(hospitalId, user);

    if (files.length === 0) {
      throw new BadRequestException('At least one image file is required');
    }

    const created = [];
    for (const file of files) {
      // Create first (without an image) to obtain the row's id, then store
      // the file keyed by that id - same two-step pattern as Departments/
      // HospitalServices.
      const row = await this.prisma.previewImage.create({ data: { hospitalId, imageName: '' } });
      const stored = await this.fileStorage.store(STORAGE_ENTITY, row.id.toString(), file.filename, file.buffer);
      created.push(
        await this.prisma.previewImage.update({
          where: { id: row.id },
          data: { imageName: stored.relativePath },
        }),
      );
    }

    return created;
  }

  async update(id: bigint, user: AuthenticatedUser, file?: ParsedMultipartFile) {
    const previewImage = await this.findOne(id);
    await this.assertHospitalOwnerOrAdmin(previewImage.hospitalId, user);

    if (!file) {
      throw new BadRequestException('An image file is required');
    }

    await this.fileStorage.deleteDirectory(STORAGE_ENTITY, id);
    const stored = await this.fileStorage.store(STORAGE_ENTITY, id.toString(), file.filename, file.buffer);

    return this.prisma.previewImage.update({
      where: { id },
      data: { imageName: stored.relativePath },
    });
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    const previewImage = await this.findOne(id);
    await this.assertHospitalOwnerOrAdmin(previewImage.hospitalId, user);

    await this.prisma.previewImage.delete({ where: { id } });
    await this.fileStorage.deleteDirectory(STORAGE_ENTITY, id);
    return { message: 'Preview image deleted' };
  }

  private async assertHospitalOwnerOrAdmin(hospitalId: bigint, user: AuthenticatedUser): Promise<void> {
    await this.access.assertCanManage(hospitalId, user);
  }
}
