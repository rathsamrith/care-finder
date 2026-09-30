import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { EMAIL_MAX, PASSWORD_MAX, PASSWORD_MIN, Trim } from '../../../common/validation';

export class ResetPasswordDto {
  @Trim()
  @IsEmail()
  @MaxLength(EMAIL_MAX)
  email!: string;

  @IsString()
  token!: string;

  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  password!: string;
}
