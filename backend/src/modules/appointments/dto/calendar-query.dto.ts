import { IsNumberString, IsOptional } from 'class-validator';

// Query for GET /appointments/calendar?month=&year= - both optional,
// default to the current month/year in AppointmentsService.calendar.
export class CalendarQueryDto {
  @IsOptional()
  @IsNumberString()
  month?: string;

  @IsOptional()
  @IsNumberString()
  year?: string;
}
