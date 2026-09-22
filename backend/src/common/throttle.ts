import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Rate limiting. One global guard (see AppModule) applies a generous per-IP
// default; sensitive routes tighten it with the helpers below via @Throttle().
//
// Storage is in memory, so limits are per server process. Running several
// instances needs a shared store (e.g. Redis) - and behind a proxy/load balancer
// set TRUST_PROXY, otherwise every visitor shares the proxy's IP.

const MINUTE = 60_000;
export const minutes = (n: number) => n * MINUTE;

const requestEmail = (req: Record<string, any>) =>
  String(req.body?.email ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 254);

// Stricter limit per client IP.
export const perIp = (limit: number, ttlMs: number) => ({ default: { limit, ttl: ttlMs } });

// Per IP *and* email: slows password guessing against one account from one
// address, without locking the real owner out from other addresses.
export const perIpAndEmail = (limit: number, ttlMs: number) => ({
  default: { limit, ttl: ttlMs, getTracker: (req: Record<string, any>) => `${req.ip}|${requestEmail(req)}` },
});

// Per target email regardless of IP: caps how many emails (e.g. password
// reset) anyone can trigger to one address, even from many IPs.
export const perEmail = (limit: number, ttlMs: number) => ({
  default: { limit, ttl: ttlMs, getTracker: (req: Record<string, any>) => requestEmail(req) || String(req.ip) },
});

export const defaultLimitPerMinute = () => {
  const n = Number(process.env.RATE_LIMIT_PER_MINUTE);
  return Number.isInteger(n) && n > 0 ? n : 300;
};

// HTTP only: the websocket gateway has its own auth and no request/response
// pair for ThrottlerGuard to read.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    return context.getType() !== 'http';
  }
}

// TRUST_PROXY=true | <number of proxy hops> | unset (don't trust X-Forwarded-For).
export const parseTrustProxy = (value: string | undefined): boolean | number => {
  if (!value) return false;
  if (value === 'true') return true;
  const hops = Number(value);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
};
