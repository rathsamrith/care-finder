import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactMessageDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;
}
