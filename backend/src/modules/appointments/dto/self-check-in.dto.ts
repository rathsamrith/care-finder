import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

// The phone's position, sent only when the patient taps "I'm here" and allows
// location. Optional in the DTO so the service can answer "location is needed"
// in plain words instead of a validation error list.
export class SelfCheckInDto {
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}
