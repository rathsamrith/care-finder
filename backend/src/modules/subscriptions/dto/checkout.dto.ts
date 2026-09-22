import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class CheckoutDto {
  @Type(() => Number)
  @IsInt()
  subscribePlanId!: number;
}
