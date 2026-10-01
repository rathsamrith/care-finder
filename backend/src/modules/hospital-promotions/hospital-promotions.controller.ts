import { AnyAuthenticated } from '../../core/auth/decorators/any-authenticated.decorator';
import { Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { HospitalPromotionsService } from './hospital-promotions.service';
import { CreateHospitalPromotionDto } from './dto/create-hospital-promotion.dto';
import { UpdateHospitalPromotionDto } from './dto/update-hospital-promotion.dto';
import { ListHospitalPromotionsQueryDto } from './dto/list-hospital-promotions.query.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { parseMultipart } from '../../common/utils/multipart.util';
import { validateDto } from '../../common/utils/validate-dto.util';

// Mirrors the original HospitalPromotionController (nested CRUD under
// `hospitals/:id/promotions` plus the public `promotions` list route in
// Laravel; flattened to its own resource here, see MIGRATION_ROADMAP.md).
// `GET /public` has no guard at all (unlike every other route here) so it's
// declared without @UseGuards, ahead of the ':id' route, so Nest doesn't try
// to parse "public" as a promotion id.
@Controller('hospital-promotions')
@AnyAuthenticated()
export class HospitalPromotionsController {
  constructor(private readonly hospitalPromotionsService: HospitalPromotionsService) {}

  @Get('public')
  publicList() {
    return this.hospitalPromotionsService.publicList();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListHospitalPromotionsQueryDto) {
    return this.hospitalPromotionsService.list(user, query.hospitalId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.hospitalPromotionsService.findOne(BigInt(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Req() req: FastifyRequest) {
    const { fields, files } = await parseMultipart(req);
    const dto = await validateDto(CreateHospitalPromotionDto, fields);
    return this.hospitalPromotionsService.create(user, dto, files[0]);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ) {
    const { fields, files } = await parseMultipart(req);
    const dto = await validateDto(UpdateHospitalPromotionDto, fields);
    return this.hospitalPromotionsService.update(BigInt(id), user, dto, files[0]);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.hospitalPromotionsService.remove(BigInt(id), user);
  }
}
