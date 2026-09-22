import { IsDateString, IsNumberString } from 'class-validator';

export class AvailabilityQueryDto {
  @IsNumberString()
  doctorId!: string;

  @IsDateString()
  date!: string;
}
