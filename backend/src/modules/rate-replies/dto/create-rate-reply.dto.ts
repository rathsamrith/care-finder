import { Type } from 'class-transformer';
import { IsInt, IsString, MinLength } from 'class-validator';

export class CreateRateReplyDto {
  @Type(() => Number)
  @IsInt()
  rateId!: number;

  @IsString()
  @MinLength(1)
  content!: string;
}
