import { IsOptional, IsString } from 'class-validator';

// Editable fields only: the doctor's bio/response text, plus the linked
// User's name/phone. Email/password are not editable through this route.
export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  response?: string;
}
