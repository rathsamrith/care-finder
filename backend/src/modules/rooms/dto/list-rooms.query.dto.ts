import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ListRoomsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hospitalId?: number;
}
