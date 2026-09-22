import { Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { ListDepartmentsQueryDto } from './dto/list-departments.query.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { parseMultipart } from '../../common/utils/multipart.util';
import { validateDto } from '../../common/utils/validate-dto.util';

// Mirrors the original DepartmentController (`departments` routes, see
// MIGRATION_ROADMAP.md), except the "update" route is a proper PUT here -
// the Laravel original mistakenly used POST for it. All routes require
// auth; create/update/delete are restricted to the owning hospital or an
// admin (enforced in DepartmentsService).
@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  list(@Query() query: ListDepartmentsQueryDto) {
    return this.departmentsService.list(query.hospitalId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.findOne(BigInt(id));
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Req() req: FastifyRequest) {
    const { fields, files } = await parseMultipart(req);
    const dto = await validateDto(CreateDepartmentDto, fields);
    return this.departmentsService.create(user, dto, files[0]);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ) {
    const { fields, files } = await parseMultipart(req);
    const dto = await validateDto(UpdateDepartmentDto, fields);
    return this.departmentsService.update(BigInt(id), user, dto, files[0]);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.remove(BigInt(id), user);
  }
}
