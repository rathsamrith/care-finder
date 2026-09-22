import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ListPreviewImagesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hospitalId?: number;
}
