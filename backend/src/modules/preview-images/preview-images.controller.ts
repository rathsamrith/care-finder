import { AnyAuthenticated } from '../../core/auth/decorators/any-authenticated.decorator';
import { Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { PreviewImagesService } from './preview-images.service';
import { CreatePreviewImagesDto } from './dto/create-preview-images.dto';
import { ListPreviewImagesQueryDto } from './dto/list-preview-images.query.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { parseMultipart } from '../../common/utils/multipart.util';
import { validateDto } from '../../common/utils/validate-dto.util';

// Mirrors the original PreviewImageController (nested under
// `hospitals/:id/previewImages` in Laravel; flattened to its own resource
// here, see MIGRATION_ROADMAP.md). `index` was an unimplemented stub in the
// original - implemented properly here. All routes require auth;
// create/update/delete are restricted to the owning hospital or an admin
// (enforced in PreviewImagesService).
@Controller('preview-images')
@UseGuards(JwtAuthGuard, RolesGuard)
@AnyAuthenticated()
export class PreviewImagesController {
  constructor(private readonly previewImagesService: PreviewImagesService) {}

  @Get()
  list(@Query() query: ListPreviewImagesQueryDto) {
    return this.previewImagesService.list(query.hospitalId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.previewImagesService.findOne(BigInt(id));
  }

  // Accepts multiple image files in one request - one PreviewImage row is
  // created per file, matching the original store()'s loop-over-array
  // behavior.
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Req() req: FastifyRequest) {
    const { fields, files } = await parseMultipart(req);
    const dto = await validateDto(CreatePreviewImagesDto, fields);
    return this.previewImagesService.createMany(user, dto, files);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ) {
    const { files } = await parseMultipart(req);
    return this.previewImagesService.update(BigInt(id), user, files[0]);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.previewImagesService.remove(BigInt(id), user);
  }
}
