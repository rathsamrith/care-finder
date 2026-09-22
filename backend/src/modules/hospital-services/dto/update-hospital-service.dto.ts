import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// `hospitalId` is deliberately absent - a service doesn't move between
// hospitals after creation.
export class UpdateHospitalServiceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
