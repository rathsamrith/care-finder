import { IsOptional, IsString } from 'class-validator';

// All fields optional on update - a partial edit (e.g. just fixing the
// province) shouldn't require resending the whole address.
export class UpdateUserAddressDto {
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
}
