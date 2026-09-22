import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Submitted as multipart/form-data (name/details/hospitalId fields + an
// optional image file) - see DepartmentsController.create, which parses the
// raw request with parseMultipart() and validates the resulting fields
// object against this DTO with validateDto().
export class CreateDepartmentDto {
  @Type(() => Number)
  @IsInt()
  hospitalId!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  details?: string;
}
