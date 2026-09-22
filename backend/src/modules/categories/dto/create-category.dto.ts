import { IsOptional, IsString, MinLength } from 'class-validator';

// Categories are a global taxonomy hospitals pick from (Hospital.categoryId)
// - not owned by any one hospital, so only admins manage them (see
// CategoriesController).
export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
