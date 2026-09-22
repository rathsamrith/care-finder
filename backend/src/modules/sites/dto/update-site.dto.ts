import { IsArray, IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

// `template`, `theme` and `sections` are validated field-by-field in
// sanitizeSiteConfig() (nested JSON the class-validator whitelist can't
// describe); this DTO only guards the top-level shape.
export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsObject()
  theme?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  sections?: unknown[];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  heroSubtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
