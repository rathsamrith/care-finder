import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

// The original Laravel SubscribePlanController only ever implemented
// `index` - store/update/destroy were stubs. This completes the CRUD since
// plans need to be creatable somehow (see MIGRATION_ROADMAP.md, Phase 5).
export class CreateSubscribePlanDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price!: number;

  @IsString()
  @MinLength(1)
  currency!: string;

  // Duration in days.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;
}
