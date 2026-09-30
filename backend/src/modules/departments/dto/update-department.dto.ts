import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// `hospitalId` is deliberately absent - a department doesn't move between
// hospitals after creation. The image is handled separately (an optional
// file part alongside these fields - see DepartmentsController.update).
export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  details?: string;
}
