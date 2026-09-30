import { IsOptional, IsString, MinLength } from 'class-validator';

// Written by hand (all fields optional) rather than pulled in via
// PartialType(CreateCategoryDto) - @nestjs/mapped-types isn't a dependency
// of this project (see other modules' update DTOs for the same convention).
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
