import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { EMAIL_MAX, NAME_MAX, PASSWORD_MAX, PASSWORD_MIN, Trim } from '../../../common/validation';

// Mirrors AuthController::register's password rule, plus the doctor-profile
// fields from the original DoctorController::store. `hospitalId` is
// client-supplied but cross-checked against the caller's own hospital in
// DoctorsService.create - a 'hospital' role user can only staff their own
// hospital.
export class CreateDoctorDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX)
  firstName!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX)
  lastName!: string;

  @Trim()
  @IsEmail()
  @MaxLength(EMAIL_MAX)
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  response?: string;

  @Type(() => Number)
  @IsInt()
  hospitalId!: number;
}
