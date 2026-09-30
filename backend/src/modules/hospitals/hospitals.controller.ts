import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';

// Route shape mirrors the original HospitalController (see MIGRATION_ROADMAP.md
// "Route mapping" table). Read routes (list/show) are public - hospitals was
// a public directory in the original app; CareFinder's discovery screens
// (Explore/Nearby) depend on browsing working without an account. Mutating
// routes stay behind JwtAuthGuard, applied per-route below.
@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Get()
  findAll() {
    return this.hospitalsService.findAll();
  }

  // Must come before the `:id` route below so "list" isn't swallowed as an
  // id param (every frontend call site requests this exact path).
  @Get('list')
  list() {
    return this.hospitalsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hospital')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHospitalDto) {
    return this.hospitalsService.create(user.id, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.hospitalsService.findOne(BigInt(id));
  }

  // Alias - every frontend call site requests `/hospitals/show/:id`, not
  // the bare `/hospitals/:id` above. Must come before the bare `:id` route
  // isn't an issue here since "show" is a fixed literal segment, but keep
  // declaration order consistent with the other aliases in this file.
  @Get('show/:id')
  show(@Param('id', ParseIntPipe) id: number) {
    return this.hospitalsService.findOne(BigInt(id));
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateHospitalDto,
  ) {
    return this.hospitalsService.update(BigInt(id), user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.hospitalsService.remove(BigInt(id), user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/upload')
  async upload(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ) {
    const file = await req.file();
    if (!file) {
      return { message: 'No file provided' };
    }
    const buffer = await file.toBuffer();
    return this.hospitalsService.addPreviewImage(BigInt(id), user, file.filename, buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/uploadCover')
  async uploadCover(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ) {
    const file = await req.file();
    if (!file) {
      return { message: 'No file provided' };
    }
    const buffer = await file.toBuffer();
    return this.hospitalsService.uploadCover(BigInt(id), user, file.filename, buffer);
  }
}
