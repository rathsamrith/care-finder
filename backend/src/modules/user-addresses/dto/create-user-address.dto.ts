import { IsOptional, IsString } from 'class-validator';

// `userId` is deliberately absent - always the current authenticated user.
// Every location field is individually optional (matches the nullable
// Prisma columns), but the service layer rejects a request where *all* of
// them are blank - an address row with zero location data isn't useful and
// almost certainly indicates a client bug. See UserAddressesService.create.
export class CreateUserAddressDto {
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
