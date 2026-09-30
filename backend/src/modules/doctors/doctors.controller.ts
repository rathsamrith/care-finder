import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { ListDoctorsQueryDto } from './dto/list-doctors.query.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';

// Route shape mirrors the original DoctorController (see MIGRATION_ROADMAP.md
// "Route mapping" table). Every route requires auth; role/ownership checks
// beyond that live in DoctorsService.
@UseGuards(JwtAuthGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListDoctorsQueryDto) {
    return this.doctorsService.findAll(user, query.hospitalId);
  }

  @UseGuards(RolesGuard)
  @Roles('hospital')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDoctorDto) {
    return this.doctorsService.create(user, dto);
  }

  @Get(':id/schedule')
  schedule(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.getSchedule(BigInt(id));
  }

  @Put(':id/schedule')
  setSchedule(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetScheduleDto,
  ) {
    return this.doctorsService.setSchedule(BigInt(id), user, dto.days);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.findOne(BigInt(id));
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDoctorDto,
  ) {
    return this.doctorsService.update(BigInt(id), user, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.doctorsService.remove(BigInt(id), user);
  }
}
