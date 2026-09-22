import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

// Written by hand (all fields optional) rather than pulled in via
// PartialType(CreateSubscribePlanDto) - @nestjs/mapped-types isn't a
// dependency of this project (see other modules' update DTOs for the same
// convention).
export class UpdateSubscribePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;
}
