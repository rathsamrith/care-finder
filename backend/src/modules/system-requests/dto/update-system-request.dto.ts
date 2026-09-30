import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SystemRequestStatus } from '@prisma/client';

export class UpdateSystemRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  requestDetails?: string;

  // Accepted from any authenticated caller at the DTO/validation level, but
  // the service silently drops this field for non-admins - see
  // SystemRequestsService.update for the chosen (documented) behavior.
  @IsOptional()
  @IsEnum(SystemRequestStatus)
  requestStatus?: SystemRequestStatus;
}
