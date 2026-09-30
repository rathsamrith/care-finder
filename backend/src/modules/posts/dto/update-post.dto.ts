import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
