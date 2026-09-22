import { IsDateString, IsNotEmpty, IsNumberString, IsOptional, IsString, Matches } from 'class-validator';

const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

// Mirrors AppointmentController::store's inline validate() rules from the
// deleted Laravel app (see MIGRATION_ROADMAP.md). IDs travel as numeric
// strings (not `number`) to avoid JS float precision loss on BigInt ids -
// converted to BigInt in AppointmentsService.
export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  // Required for a patient's own booking; ignored for a doctor-initiated one
  // (the service resolves the caller's own hospital/doctor server-side
  // instead) - so these can't be `@IsNotEmpty` here, AppointmentsService.create()
  // enforces presence on the patient path itself.
  @IsOptional()
  @IsNumberString()
  hospitalId?: string;

  @IsOptional()
  @IsNumberString()
  doctorId?: string;

  @IsOptional()
  @IsNumberString()
  roomId?: string;

  // Target patient - only honored when the caller is a doctor creating an
  // appointment on a patient's behalf. Ignored (and required to be absent)
  // for a patient's own self-booking, where `userId` always comes from the
  // authenticated caller instead. See AppointmentsService.create().
  @IsOptional()
  @IsNumberString()
  userId?: string;

  @IsDateString()
  appointmentDate!: string;

  @Matches(TIME_PATTERN, { message: 'appointmentTime must be in HH:mm or HH:mm:ss format' })
  appointmentTime!: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'appointmentEnd must be in HH:mm or HH:mm:ss format' })
  appointmentEnd?: string;
}
