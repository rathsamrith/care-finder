import { buildCorsOrigin } from './cors-origin.util';

const check = (fn: ReturnType<typeof buildCorsOrigin>, origin?: string) =>
  new Promise<boolean | undefined>((res) => fn(origin, (_e, allow) => res(allow)));

describe('buildCorsOrigin', () => {
  const fn = buildCorsOrigin('http://localhost:5173, https://app.carefinder.com', 'carefinder.com');

  it('allows listed origins and hospital subdomains', async () => {
    expect(await check(fn, 'http://localhost:5173')).toBe(true);
    expect(await check(fn, 'https://city-hospital.carefinder.com')).toBe(true);
  });
  it('rejects lookalikes, http subdomains and nested/other hosts', async () => {
    expect(await check(fn, 'https://evilcarefinder.com')).toBe(false);
    expect(await check(fn, 'https://carefinder.com.evil.com')).toBe(false);
    expect(await check(fn, 'http://x.carefinder.com')).toBe(false);
    expect(await check(fn, 'https://a.b.carefinder.com')).toBe(false);
  });
  it('allows requests without an Origin header; nothing configured = deny browsers', async () => {
    expect(await check(fn, undefined)).toBe(true);
    expect(await check(buildCorsOrigin(), 'https://x.com')).toBe(false);
  });
});
