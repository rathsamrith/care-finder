import { IsString, MinLength } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  @MinLength(1)
  paymentIntentId!: string;
}
