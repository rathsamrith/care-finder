import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches } from 'class-validator';

// Same shape as CreateHospitalDto but every field optional (redeclared
// rather than pulled in via @nestjs/mapped-types, which isn't a dependency
// of this project yet).
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export class UpdateHospitalDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @IsString()
  village?: string;

  @IsOptional()
  @IsString()
  commune?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  latitude?: string;

  @IsOptional()
  @IsString()
  longitude?: string;

  @IsOptional()
  @IsString()
  mission?: string;

  @IsOptional()
  @IsString()
  vision?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'openTime must be in HH:mm or HH:mm:ss format' })
  openTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'closeTime must be in HH:mm or HH:mm:ss format' })
  closeTime?: string;
}
