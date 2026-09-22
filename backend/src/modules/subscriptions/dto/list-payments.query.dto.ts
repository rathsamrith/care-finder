import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

// `userId` is only honored for admins - a non-admin caller always gets
// their own history regardless of what's passed here (see service).
export class ListPaymentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}
