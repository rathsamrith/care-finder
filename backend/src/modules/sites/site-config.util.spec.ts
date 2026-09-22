import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { slugify, validateSlug } from './site-catalog';
import { downgradeForFreeTier, isSubscriptionActive, sanitizeSiteConfig } from './site-config.util';

describe('validateSlug', () => {
  it.each(['city-hospital', 'abc', 'h0spital-1'])('accepts %s', (s) => expect(validateSlug(s)).toBeNull());
  it.each(['ab', '-abc', 'abc-', 'Abc', 'a_b_c', 'a--b', 'x'.repeat(41), 'www', 'admin', 'api'])(
    'rejects %s',
    (s) => expect(validateSlug(s)).not.toBeNull(),
  );
});

describe('slugify', () => {
  it('normalizes names', () => {
    expect(slugify('Calmette Hospital & Clinic')).toBe('calmette-hospital-clinic');
    expect(slugify('ពេទ្យ')).toBe('');
  });
});

describe('sanitizeSiteConfig', () => {
  it('returns defaults for empty input', () => {
    const c = sanitizeSiteConfig({}, false);
    expect(c.template).toBe('classic');
    expect(c.sections.map((s) => s.type)).toContain('hero');
  });

  it('rejects premium template/section for free hospitals with 403', () => {
    expect(() => sanitizeSiteConfig({ template: 'modern' }, false)).toThrow(ForbiddenException);
    expect(() => sanitizeSiteConfig({ sections: [{ type: 'reviews', enabled: true }] }, false)).toThrow(
      ForbiddenException,
    );
    expect(sanitizeSiteConfig({ template: 'modern' }, true).template).toBe('modern');
  });

  it('allows a disabled premium section for free hospitals', () => {
    expect(() => sanitizeSiteConfig({ sections: [{ type: 'reviews', enabled: false }] }, false)).not.toThrow();
  });

  it('rejects bad colors, unknown enums and duplicate sections', () => {
    expect(() => sanitizeSiteConfig({ theme: { primary: 'red' } }, true)).toThrow(BadRequestException);
    expect(() => sanitizeSiteConfig({ theme: { primary: '#fff; background:url(x)' } }, true)).toThrow(
      BadRequestException,
    );
    expect(() => sanitizeSiteConfig({ template: 'hacker' }, true)).toThrow(BadRequestException);
    expect(() => sanitizeSiteConfig({ theme: { font: 'comic' } }, true)).toThrow(BadRequestException);
    expect(() =>
      sanitizeSiteConfig({ sections: [{ type: 'hero' }, { type: 'hero' }] }, true),
    ).toThrow(BadRequestException);
  });

  it('strips markup characters from section text and lowercases colors', () => {
    const c = sanitizeSiteConfig(
      { theme: { primary: '#ABCDEF' }, sections: [{ type: 'hero', title: '<script>alert(1)</script>Hi' }] },
      true,
    );
    expect(c.theme.primary).toBe('#abcdef');
    expect(c.sections[0].title).toBe('scriptalert(1)/scriptHi');
  });
});

describe('downgradeForFreeTier', () => {
  it('swaps premium template and disables premium sections', () => {
    const c = downgradeForFreeTier(
      sanitizeSiteConfig({ template: 'bold', sections: [{ type: 'hero' }, { type: 'promotions' }] }, true),
    );
    expect(c.template).toBe('classic');
    expect(c.sections.find((s) => s.type === 'promotions')?.enabled).toBe(false);
    expect(c.sections.find((s) => s.type === 'hero')?.enabled).toBe(true);
  });
});

describe('isSubscriptionActive', () => {
  const now = new Date('2026-09-30T00:00:00Z');
  const pay = (daysAgo: number, duration: number | null) => ({
    createdAt: new Date(now.getTime() - daysAgo * 86_400_000),
    subscribePlan: { duration },
  });
  it('is inactive with no payments', () => expect(isSubscriptionActive([], now)).toBe(false));
  it('one-time plan never expires', () => expect(isSubscriptionActive([pay(900, null)], now)).toBe(true));
  it('timed plan active inside the window, lapsed outside', () => {
    expect(isSubscriptionActive([pay(10, 30)], now)).toBe(true);
    expect(isSubscriptionActive([pay(31, 30)], now)).toBe(false);
  });
  it('any active payment is enough', () => {
    expect(isSubscriptionActive([pay(100, 30), pay(5, 30)], now)).toBe(true);
  });
});
