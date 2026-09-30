import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ListHospitalPromotionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hospitalId?: number;
}
