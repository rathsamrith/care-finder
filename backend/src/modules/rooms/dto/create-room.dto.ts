import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @Type(() => Number)
  @IsInt()
  hospitalId!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  numberOfBed?: number;
}
