import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

// `userId` is deliberately absent - the author is always the current
// authenticated user, never client-supplied.
export class CreatePostDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
