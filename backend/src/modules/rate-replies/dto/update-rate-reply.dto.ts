import { IsString, MinLength } from 'class-validator';

export class UpdateRateReplyDto {
  @IsString()
  @MinLength(1)
  content!: string;
}
