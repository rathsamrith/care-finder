// Single source of truth for what a hospital site may contain. The frontend
// mirrors the ids in frontend/src/components/site/catalog.ts - keep in sync.

export const FREE_TEMPLATES = ['classic', 'minimal'] as const;
export const PREMIUM_TEMPLATES = ['modern', 'bold'] as const;
export const TEMPLATES = [...FREE_TEMPLATES, ...PREMIUM_TEMPLATES] as const;
export type SiteTemplate = (typeof TEMPLATES)[number];

export const FREE_SECTIONS = ['hero', 'about', 'services', 'departments', 'doctors', 'gallery', 'contact'] as const;
export const PREMIUM_SECTIONS = ['promotions', 'reviews'] as const;
export const SECTIONS = [...FREE_SECTIONS, ...PREMIUM_SECTIONS] as const;
export type SiteSectionType = (typeof SECTIONS)[number];

export const RADII = ['none', 'sm', 'md', 'lg'] as const;
export const FONTS = ['sans', 'serif', 'rounded'] as const;

export interface SiteTheme {
  primary: string;
  accent: string;
  radius: (typeof RADII)[number];
  font: (typeof FONTS)[number];
}

export interface SiteSection {
  type: SiteSectionType;
  enabled: boolean;
  title?: string;
  subtitle?: string;
}

export const DEFAULT_THEME: SiteTheme = {
  primary: '#176B5B',
  accent: '#C98A2B',
  radius: 'md',
  font: 'sans',
};

export const DEFAULT_SECTIONS: SiteSection[] = FREE_SECTIONS.map((type) => ({ type, enabled: true }));

// Labels that would let a hospital impersonate the platform or collide with
// infrastructure hostnames.
export const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'mail', 'email', 'smtp', 'ftp', 'static', 'assets', 'cdn', 'uploads',
  'dashboard', 'login', 'register', 'support', 'help', 'status', 'blog', 'docs', 'dev', 'staging', 'test',
  'carefinder', 'care-finder', 'care', 'finder', 'localhost', 'root', 'system',
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

export function validateSlug(slug: string): string | null {
  if (!SLUG_RE.test(slug)) {
    return 'Slug must be 3-40 characters: lowercase letters, numbers and hyphens, not starting or ending with a hyphen';
  }
  if (slug.includes('--')) return 'Slug cannot contain consecutive hyphens';
  if (RESERVED_SLUGS.has(slug)) return 'This address is reserved';
  return null;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export const isPremiumTemplate = (t: string) => (PREMIUM_TEMPLATES as readonly string[]).includes(t);
export const isPremiumSection = (t: string) => (PREMIUM_SECTIONS as readonly string[]).includes(t);
