import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  DEFAULT_SECTIONS,
  DEFAULT_THEME,
  FONTS,
  RADII,
  SECTIONS,
  SiteSection,
  SiteTemplate,
  SiteTheme,
  TEMPLATES,
  isPremiumSection,
  isPremiumTemplate,
} from './site-catalog';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_TEXT = 160;

export interface SiteConfigInput {
  template?: unknown;
  theme?: unknown;
  sections?: unknown;
}

export interface SanitizedSiteConfig {
  template: SiteTemplate;
  theme: SiteTheme;
  sections: SiteSection[];
}

// Plain text only: strip control chars and angle brackets so stored values can
// never carry markup, even if a future renderer forgets to escape.
export function cleanText(value: unknown, max = MAX_TEXT): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new BadRequestException('Text fields must be strings');
  const cleaned = value.replace(/[\u0000-\u001f\u007f<>]/g, '').trim();
  if (cleaned.length > max) throw new BadRequestException(`Text must be at most ${max} characters`);
  return cleaned || undefined;
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value as T;
}

// Validates a client-supplied config against the catalog. `entitled` = the
// hospital has an active subscription; free hospitals get a 403 if they pick
// premium templates/sections (so the editor can show the upsell) rather than a
// silent downgrade.
export function sanitizeSiteConfig(input: SiteConfigInput, entitled: boolean): SanitizedSiteConfig {
  const template =
    input.template === undefined ? 'classic' : pickEnum(input.template, TEMPLATES, 'template');
  if (isPremiumTemplate(template) && !entitled) {
    throw new ForbiddenException('This template requires an active subscription');
  }

  let theme: SiteTheme = { ...DEFAULT_THEME };
  if (input.theme !== undefined) {
    if (typeof input.theme !== 'object' || input.theme === null || Array.isArray(input.theme)) {
      throw new BadRequestException('Invalid theme');
    }
    const raw = input.theme as Record<string, unknown>;
    const color = (key: 'primary' | 'accent') => {
      const v = raw[key];
      if (v === undefined) return DEFAULT_THEME[key];
      if (typeof v !== 'string' || !HEX_RE.test(v)) throw new BadRequestException(`Invalid ${key} color`);
      return v.toLowerCase();
    };
    theme = {
      primary: color('primary'),
      accent: color('accent'),
      radius: raw.radius === undefined ? DEFAULT_THEME.radius : pickEnum(raw.radius, RADII, 'radius'),
      font: raw.font === undefined ? DEFAULT_THEME.font : pickEnum(raw.font, FONTS, 'font'),
    };
  }

  let sections: SiteSection[] = DEFAULT_SECTIONS.map((s) => ({ ...s }));
  if (input.sections !== undefined) {
    if (!Array.isArray(input.sections) || input.sections.length > SECTIONS.length) {
      throw new BadRequestException('Invalid sections');
    }
    const seen = new Set<string>();
    sections = input.sections.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) throw new BadRequestException('Invalid section');
      const raw = item as Record<string, unknown>;
      const type = pickEnum(raw.type, SECTIONS, 'section type');
      if (seen.has(type)) throw new BadRequestException(`Duplicate section: ${type}`);
      seen.add(type);
      const enabled = raw.enabled === undefined ? true : raw.enabled === true;
      if (enabled && isPremiumSection(type) && !entitled) {
        throw new ForbiddenException(`The ${type} section requires an active subscription`);
      }
      return { type, enabled, title: cleanText(raw.title, 80), subtitle: cleanText(raw.subtitle) };
    });
  }

  return { template: template as SiteTemplate, theme, sections };
}

// Applied on read: if a subscription lapsed after a premium pick was saved,
// serve a free-tier version instead of failing the public site.
export function downgradeForFreeTier(config: SanitizedSiteConfig): SanitizedSiteConfig {
  return {
    template: isPremiumTemplate(config.template) ? 'classic' : config.template,
    theme: config.theme,
    sections: config.sections.map((s) =>
      isPremiumSection(s.type) ? { ...s, enabled: false } : s,
    ),
  };
}

export interface PaymentLike {
  createdAt: Date;
  subscribePlan: { duration: number | null };
}

// Active = any payment for a one-time plan (no duration), or a timed plan whose
// window (createdAt + duration days) hasn't elapsed.
export function isSubscriptionActive(payments: PaymentLike[], now = new Date()): boolean {
  return payments.some((p) => {
    const days = p.subscribePlan.duration;
    if (days === null || days === undefined) return true;
    return p.createdAt.getTime() + days * 86_400_000 > now.getTime();
  });
}
