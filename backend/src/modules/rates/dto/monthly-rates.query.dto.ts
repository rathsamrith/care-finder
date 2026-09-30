import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class MonthlyRatesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hospitalId?: number;
}
