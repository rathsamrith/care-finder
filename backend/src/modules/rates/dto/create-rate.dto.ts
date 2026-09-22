import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Mirrors the original FeedbackController::store validation rules.
// `userId` is deliberately absent - the reviewer is always the current
// authenticated user, never client-supplied.
export class CreateRateDto {
  @Type(() => Number)
  @IsInt()
  hospitalId!: number;

  @IsOptional()
  @IsString()
  content?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  star!: number;
}
