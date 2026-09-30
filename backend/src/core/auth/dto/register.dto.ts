import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { EMAIL_MAX, NAME_MAX, PASSWORD_MAX, PASSWORD_MIN, PHONE_PATTERN, Trim } from '../../../common/validation';

// Mirrors AuthController::register's inline validate() rules.
export class RegisterDto {
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

  @Trim()
  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string;

  // Which role this account registers as - Laravel assigned 'hospital' or
  // 'user' at register time based on a request field.
  @IsIn(['hospital', 'user'])
  role!: 'hospital' | 'user';
}
