import { AppointmentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNumberString, IsOptional } from 'class-validator';

// Optional filters for GET /appointments, applied on top of the caller's
// role-based visibility scope (AppointmentsService.roleScopeWhere).
export class QueryAppointmentsDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsNumberString()
  hospitalId?: string;

  @IsOptional()
  @IsNumberString()
  doctorId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
