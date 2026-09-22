import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsString } from 'class-validator';

// Submitted as multipart/form-data (hospitalId/title/description/startDate/
// endDate fields + an optional image file). See
// HospitalPromotionsController.create, which parses the raw request with
// parseMultipart() and validates the resulting fields object against this
// DTO with validateDto().
export class CreateHospitalPromotionDto {
  @Type(() => Number)
  @IsInt()
  hospitalId!: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
