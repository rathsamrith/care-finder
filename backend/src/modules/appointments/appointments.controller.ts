import { AnyAuthenticated } from '../../core/auth/decorators/any-authenticated.decorator';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CheckInService } from './check-in.service';
import { SelfCheckInDto } from './dto/self-check-in.dto';
import { Throttle } from '@nestjs/throttler';
import { minutes, perIp } from '../../common/throttle';

// Route mapping vs. the deleted Laravel `AppointmentController` is documented
// in MIGRATION_ROADMAP.md. Role-based visibility (admin sees all, hospital
// sees its own, doctor sees its own, patient sees their own) is enforced
// inside AppointmentsService, not by RolesGuard - it depends on record
// ownership, not just role membership. @Roles() below is only used as a
// coarse pre-filter for actions that are role-exclusive regardless of
// ownership (e.g. only patients can create/cancel, only admin can delete).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly checkIn: CheckInService,
  ) {}

  @AnyAuthenticated()
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryAppointmentsDto) {
    return this.appointmentsService.list(user, query);
  }

  // Alias - every frontend call site requests `/appointments/list`, not the
  // bare path above. Must come before the other named GET routes so it
  // doesn't shadow them, though as a fixed literal segment order among
  // literals doesn't actually matter - kept here for readability.
  @AnyAuthenticated()
  @Get('list')
  listAlias(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryAppointmentsDto) {
    return this.appointmentsService.list(user, query);
  }

  // Doctor free/busy grid for a day (times only). Literal route, so it must
  // stay above any `:id` wildcard below.
  @AnyAuthenticated()
  @Get('availability')
  availability(@Query() query: AvailabilityQueryDto) {
    return this.appointmentsService.availability(BigInt(query.doctorId), query.date);
  }

  // Today's queue for reception and doctors. Literal route, above `:id`.
  @Roles('hospital', 'doctor')
  @Get('queue')
  queue(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.queue(user);
  }

  @AnyAuthenticated()
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.summary(user);
  }

  @AnyAuthenticated()
  @Get('today')
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.today(user);
  }

  @AnyAuthenticated()
  @Get('calendar')
  calendar(@CurrentUser() user: AuthenticatedUser, @Query() query: CalendarQueryDto) {
    return this.appointmentsService.calendar(user, query.month, query.year);
  }

  @AnyAuthenticated()
  @Get('monthly')
  monthly(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.monthly(user);
  }

  // Alias - frontend requests this exact path.
  @AnyAuthenticated()
  @Get('monthlyAppointments')
  monthlyAlias(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.monthly(user);
  }

  // Doctor-only patient lookup for the "new appointment" picker. Registered
  // before `:id` below - `/patients/search` is two path segments so it can't
  // collide with the single-segment `:id` wildcard, but kept up here to read
  // next to the other literal routes rather than buried after them.
  @Roles('doctor')
  @Get('patients/search')
  searchPatients(@Query('q') q: string) {
    return this.appointmentsService.searchPatients(q);
  }

  @AnyAuthenticated()
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentsService.findOne(user, BigInt(id));
  }

  // Patients book their own appointments; doctors can also create one
  // directly on a patient's behalf (AppointmentsService.create() resolves
  // the doctor's own doctorId/hospitalId server-side and requires dto.userId).
  @Roles('user', 'doctor')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user, dto);
  }

  // Alias - frontend requests this exact path.
  @Roles('user', 'doctor')
  @Post('create')
  createAlias(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user, dto);
  }

  // Patient (owner) or admin, and only while status is still Pending -
  // enforced inside the service (needs the record to check ownership/status).
  @Roles('user', 'admin')
  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(user, BigInt(id), dto);
  }

  // Alias - frontend requests this exact path (and sends snake_case field
  // names the DTO doesn't accept - fixed at the call sites, see API
  // contract alignment plan).
  @Roles('user', 'admin')
  @Put('update/:id')
  updateAlias(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(user, BigInt(id), dto);
  }

  // Hospital sets its own target, doctor sets its own, admin can set either -
  // enforced inside the service (needs the record to check which hospital/
  // doctor owns it).
  @Roles('admin', 'hospital', 'doctor')
  @Put(':id/update-status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(user, BigInt(id), dto);
  }

  // Alias - frontend requests this exact path and never sends `target`
  // (it doesn't distinguish hospital vs. doctor client-side); the service
  // infers it from the caller's own role instead. Also accepts an optional
  // `roomId` so the doctor's "assign room and confirm" flow can do both in
  // one call, matching what the frontend already sends.
  @Roles('admin', 'hospital', 'doctor')
  @Put('update-status/:id')
  updateStatusAlias(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status: string; roomId?: string; room_id?: string },
  ) {
    return this.appointmentsService.updateStatusForCaller(user, BigInt(id), body);
  }

  // ---- check-in ------------------------------------------------------------------
  // The patient's code (QR / text) to scan or type at a kiosk.
  @Roles('user')
  @Get(':id/check-in-code')
  checkInCode(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.checkIn.codeFor(user, BigInt(id));
  }

  // "I'm here" from the patient's own phone (needs the time window + location).
  @Roles('user')
  @Throttle(perIp(30, minutes(10)))
  @Post(':id/check-in')
  selfCheckIn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SelfCheckInDto,
  ) {
    return this.checkIn.checkInSelf(user, BigInt(id), dto);
  }

  // Reception (or the doctor) checks a patient in by hand.
  @Roles('hospital', 'doctor')
  @Post(':id/arrive')
  arrive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.checkIn.checkInStaff(user, BigInt(id));
  }

  // The doctor or reception marks the visit done.
  @Roles('hospital', 'doctor')
  @Put(':id/complete')
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.checkIn.complete(user, BigInt(id));
  }

  // Patient (owner) or admin.
  @Roles('user', 'admin')
  @Put(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentsService.cancel(user, BigInt(id));
  }

  // Alias - frontend requests this exact path.
  @Roles('user', 'admin')
  @Put('cancel/:id')
  cancelAlias(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentsService.cancel(user, BigInt(id));
  }

  // Hard delete - destructive, audit-trail-losing, admin only.
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(BigInt(id));
  }

  // Alias - frontend requests this exact path.
  @Roles('admin')
  @Delete('delete/:id')
  removeAlias(@Param('id') id: string) {
    return this.appointmentsService.remove(BigInt(id));
  }
}
