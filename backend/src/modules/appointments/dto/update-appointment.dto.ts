import { IsDateString, IsNumberString, IsOptional, IsString, Matches } from 'class-validator';

const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

// General field update (title/date/time/room) - written out by hand rather
// than via `PartialType(CreateAppointmentDto)` since `@nestjs/mapped-types`
// isn't a project dependency yet. Deliberately omits hospitalId/doctorId -
// those aren't mutable via this route (see AppointmentsService.update).
export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'appointmentTime must be in HH:mm or HH:mm:ss format' })
  appointmentTime?: string;

  // Pass an empty string to clear the field.
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'appointmentEnd must be in HH:mm or HH:mm:ss format' })
  appointmentEnd?: string;

  // Pass an empty string to clear the room.
  @IsOptional()
  @IsNumberString()
  roomId?: string;
}
