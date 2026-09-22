import { IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Trim } from '../../../common/validation';

export class CreateKioskDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  // The letter printed on this kiosk's queue tickets ("B" -> B-14).
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{1,3}$/, { message: 'prefix must be 1-3 letters (A-Z)' })
  prefix!: string;
}

export class KioskCheckInDto {
  @IsString()
  @Length(6, 40)
  code!: string;
}
