import { Body, Controller, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from '../core/auth/auth.controller';
import { ContactController } from '../modules/contact/contact.controller';
import { OrganizationsController } from '../modules/organizations/organizations.controller';
import { AppThrottlerGuard, minutes, parseTrustProxy, perEmail, perIp, perIpAndEmail } from './throttle';

@Controller('t')
class ProbeController {
  @Throttle(perIp(2, minutes(1)))
  @Post('ip')
  ip() {
    return { ok: true };
  }

  @Throttle(perIpAndEmail(2, minutes(1)))
  @Post('ip-email')
  ipEmail(@Body() _b: { email?: string }) {
    return { ok: true };
  }

  @Throttle(perEmail(2, minutes(1)))
  @Post('email')
  email(@Body() _b: { email?: string }) {
    return { ok: true };
  }

  @Post('open')
  open() {
    return { ok: true };
  }
}

describe('rate limiting (real Fastify app)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: minutes(1), limit: 5 }])],
      controllers: [ProbeController],
      providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterEach(() => app.close());

  const hit = async (url: string, payload: object = {}, ip = '10.0.0.1') => {
    const res = await app.inject({ method: 'POST', url, payload, remoteAddress: ip });
    return res.statusCode;
  };

  it('blocks the request after the route limit, with 429', async () => {
    expect([await hit('/t/ip'), await hit('/t/ip'), await hit('/t/ip')]).toEqual([201, 201, 429]);
  });

  it('counts per client IP', async () => {
    await hit('/t/ip'); await hit('/t/ip');
    expect(await hit('/t/ip')).toBe(429);
    expect(await hit('/t/ip', {}, '10.0.0.2')).toBe(201); // a different client is unaffected
  });

  it('per IP+email: same address guessing one account is stopped, other accounts/addresses are not', async () => {
    await hit('/t/ip-email', { email: 'a@x.com' });
    await hit('/t/ip-email', { email: 'A@X.com ' }); // same account, different spelling
    expect(await hit('/t/ip-email', { email: 'a@x.com' })).toBe(429);
    expect(await hit('/t/ip-email', { email: 'b@x.com' })).toBe(201); // another account from this IP
    expect(await hit('/t/ip-email', { email: 'a@x.com' }, '10.0.0.9')).toBe(201); // owner from another IP
  });

  it('per email: capped across different IPs', async () => {
    await hit('/t/email', { email: 'victim@x.com' }, '10.0.0.1');
    await hit('/t/email', { email: 'victim@x.com' }, '10.0.0.2');
    expect(await hit('/t/email', { email: 'victim@x.com' }, '10.0.0.3')).toBe(429);
    expect(await hit('/t/email', { email: 'someone@x.com' }, '10.0.0.3')).toBe(201);
  });

  it('routes without their own limit fall back to the global default', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push(await hit('/t/open'));
    expect(codes).toEqual([201, 201, 201, 201, 201, 429]);
  });
});

describe('the real sensitive routes carry a limit', () => {
  const limitOf = (proto: object, method: string) => Reflect.getMetadata('THROTTLER:LIMITdefault', (proto as any)[method]);
  const ttlOf = (proto: object, method: string) => Reflect.getMetadata('THROTTLER:TTLdefault', (proto as any)[method]);

  it.each([
    [AuthController, 'login', 10, minutes(15)],
    [AuthController, 'register', 10, minutes(60)],
    [AuthController, 'forgotPassword', 5, minutes(60)],
    [AuthController, 'resetPassword', 10, minutes(15)],
    [ContactController, 'create', 5, minutes(10)],
    [OrganizationsController, 'accept', 10, minutes(15)],
    [OrganizationsController, 'invite', 20, minutes(60)],
  ] as const)('%p.%s is limited to %i per window', (controller, method, limit, ttl) => {
    expect(limitOf(controller.prototype, method)).toBe(limit);
    expect(ttlOf(controller.prototype, method)).toBe(ttl);
  });
});

describe('parseTrustProxy', () => {
  it('trusts nothing unless configured', () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy('')).toBe(false);
    expect(parseTrustProxy('yes')).toBe(false);
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy('-1')).toBe(false);
  });
});
