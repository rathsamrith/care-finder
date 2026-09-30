import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

// Submitted as multipart/form-data - `hospitalId` as a form field plus one
// or more image files. See PreviewImagesController.create, which parses the
// raw request with parseMultipart() and validates the resulting fields
// object against this DTO with validateDto().
export class CreatePreviewImagesDto {
  @Type(() => Number)
  @IsInt()
  hospitalId!: number;
}
