import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ListRateRepliesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rateId?: number;
}
