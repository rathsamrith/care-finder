import { IsArray } from 'class-validator';

// The nested shape (weekday + intervals of HH:mm strings) is validated in
// parseSchedule() (doctors/schedule.util.ts), which can explain what is wrong
// in plain words; this only guards the top level.
export class SetScheduleDto {
  @IsArray()
  days!: unknown[];
}
