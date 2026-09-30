import { IsInt, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

// `userId` is deliberately absent - the requester is always the current
// authenticated user, never client-supplied. `requestStatus` is also absent
// here - new requests always start `pending` (schema default).
export class CreateSystemRequestDto {
  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  @IsString()
  @MinLength(1)
  requestDetails!: string;
}
