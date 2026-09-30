import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// The original Laravel CategoryController only ever implemented index/show -
// store/update/destroy were stubs (see MIGRATION_ROADMAP.md's "Dead/stub
// endpoints" note). This completes the CRUD.
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: bigint) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { name: dto.name, description: dto.description },
    });
  }

  async update(id: bigint, dto: UpdateCategoryDto) {
    await this.findOne(id);

    return this.prisma.category.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
    });
  }

  // Category.hospitals -> Hospital.categoryId has no onDelete: Cascade/
  // SetNull override in the schema, so Prisma's default RESTRICT behavior
  // applies: deleting a category still referenced by a hospital throws a
  // Prisma P2003 (FK constraint) error, surfaced here as a clear 400 instead
  // of a raw 500.
  async remove(id: bigint) {
    await this.findOne(id);

    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Cannot delete a category still in use by a hospital');
      }
      throw error;
    }

    return { message: 'Category deleted' };
  }
}
