import { ValidationPipe } from '@nestjs/common';

// Multipart routes read their fields manually via parseMultipart() (see
// multipart.util.ts) rather than through Nest's @Body() pipeline, since
// multipart/form-data never reaches the JSON body parser. This re-runs the
// plain fields object through an equivalently-configured ValidationPipe so
// those routes still get the same whitelist/transform/forbidNonWhitelisted
// behavior (and the same 400 error shape) as every @Body()-validated DTO in
// the app - see main.ts's global ValidationPipe for the reference config.
const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});

export function validateDto<T extends object>(
  metatype: new () => T,
  plain: Record<string, unknown>,
): Promise<T> {
  return pipe.transform(plain, { type: 'body', metatype }) as Promise<T>;
}
