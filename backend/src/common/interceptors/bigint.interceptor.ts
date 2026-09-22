import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Fastify's JSON serializer throws on `bigint` (unlike Express's), and every
// Prisma model in this app uses BigInt ids/FKs. Registered globally in
// main.ts so no controller/service needs to manually stringify ids - walks
// the response body once and converts every bigint to a string.
@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => transform(data)));
  }
}

function transform(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(transform);
  }
  if (value instanceof Date) {
    return value;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = transform(val);
    }
    return result;
  }
  return value;
}
