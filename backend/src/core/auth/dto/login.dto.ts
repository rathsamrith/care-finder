import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { EMAIL_MAX, Trim } from '../../../common/validation';

export class LoginDto {
  @Trim()
  @IsEmail()
  @MaxLength(EMAIL_MAX)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200) // bound the work bcrypt is asked to do; real passwords are <= 72
  password!: string;
}
