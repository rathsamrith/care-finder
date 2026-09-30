import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ListHospitalServicesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hospitalId?: number;
}
