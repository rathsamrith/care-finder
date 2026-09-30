import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// `hospitalId` is deliberately absent - a promotion doesn't move between
// hospitals after creation.
export class UpdateHospitalPromotionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
