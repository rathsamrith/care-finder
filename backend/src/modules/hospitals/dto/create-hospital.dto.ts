import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// Mirrors the original HospitalController::store validation rules.
// `userId` is deliberately absent - the owner is always the current
// authenticated user, never client-supplied (see HospitalsService.create).
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export class CreateHospitalDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsInt()
  categoryId!: number;

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

  // HH:mm or HH:mm:ss - converted to a Date anchored at the epoch date by
  // HospitalsService before it hits Prisma's @db.Time() column.
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'openTime must be in HH:mm or HH:mm:ss format' })
  openTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'closeTime must be in HH:mm or HH:mm:ss format' })
  closeTime?: string;
}
