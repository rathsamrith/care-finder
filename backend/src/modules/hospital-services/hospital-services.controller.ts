import { Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { HospitalServicesService } from './hospital-services.service';
import { CreateHospitalServiceDto } from './dto/create-hospital-service.dto';
import { UpdateHospitalServiceDto } from './dto/update-hospital-service.dto';
import { ListHospitalServicesQueryDto } from './dto/list-hospital-services.query.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { parseMultipart } from '../../common/utils/multipart.util';
import { validateDto } from '../../common/utils/validate-dto.util';

// Mirrors the original HospitalServiceController (nested under
// `hospitals/:id/services` in Laravel; flattened to its own resource here,
// see MIGRATION_ROADMAP.md). `list`/`findOne` are public - the hospital
// profile page's Services tab is a public discovery screen, same shape as
// HospitalsController/HospitalPromotionsController's public read routes.
// create/update/delete are restricted to the owning hospital or an admin
// (enforced in HospitalServicesService).
@Controller('hospital-services')
export class HospitalServicesController {
  constructor(private readonly hospitalServicesService: HospitalServicesService) {}

  @Get()
  list(@Query() query: ListHospitalServicesQueryDto) {
    return this.hospitalServicesService.list(query.hospitalId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.hospitalServicesService.findOne(BigInt(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Req() req: FastifyRequest) {
    const { fields, files } = await parseMultipart(req);
    const dto = await validateDto(CreateHospitalServiceDto, fields);
    return this.hospitalServicesService.create(user, dto, files[0]);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ) {
    const { fields, files } = await parseMultipart(req);
    const dto = await validateDto(UpdateHospitalServiceDto, fields);
    return this.hospitalServicesService.update(BigInt(id), user, dto, files[0]);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.hospitalServicesService.remove(BigInt(id), user);
  }
}
