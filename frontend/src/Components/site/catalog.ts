// Mirrors backend/src/modules/sites/site-catalog.ts - keep ids in sync.

export const FREE_TEMPLATES = ['classic', 'minimal'] as const
export const PREMIUM_TEMPLATES = ['modern', 'bold'] as const
export const TEMPLATES = [...FREE_TEMPLATES, ...PREMIUM_TEMPLATES] as const
export type SiteTemplate = (typeof TEMPLATES)[number]

export const FREE_SECTIONS = ['hero', 'about', 'services', 'departments', 'doctors', 'gallery', 'contact'] as const
export const PREMIUM_SECTIONS = ['promotions', 'reviews'] as const
export const SECTIONS = [...FREE_SECTIONS, ...PREMIUM_SECTIONS] as const
export type SiteSectionType = (typeof SECTIONS)[number]

export const RADII = ['none', 'sm', 'md', 'lg'] as const
export const FONTS = ['sans', 'serif', 'rounded'] as const

export interface SiteTheme {
  primary: string
  accent: string
  radius: (typeof RADII)[number]
  font: (typeof FONTS)[number]
}

export interface SiteSection {
  type: SiteSectionType
  enabled: boolean
  title?: string
  subtitle?: string
}

export interface PublicSite {
  slug: string | null
  hospitalId: number | string
  name: string
  logo: string | null
  coverImage: string | null
  category: string | null
  phoneNumber: string | null
  openTime: string | null
  closeTime: string | null
  mission: string | null
  vision: string | null
  address: Record<'street' | 'village' | 'commune' | 'district' | 'province' | 'latitude' | 'longitude', string | null>
  site: {
    template: SiteTemplate
    theme: SiteTheme
    sections: SiteSection[]
    heroImage: string | null
    heroTitle: string | null
    heroSubtitle: string | null
    seoTitle: string | null
    seoDescription: string | null
  }
  rating: { average: number; count: number }
  services: { id: number | string; name: string; description: string | null; image: string | null }[]
  departments: { id: number | string; name: string; details: string | null; image: string | null }[]
  doctors: { id: number | string; name: string; profile: string | null }[]
  gallery: { id: number | string; url: string | null }[]
  promotions: {
    id: number | string
    title: string
    description: string
    image: string | null
    startDate: string
    endDate: string
  }[]
  reviews: { id: number | string; author: string; star: number; content: string }[]
}

export const RADIUS_VALUES: Record<SiteTheme['radius'], string> = {
  none: '0px',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '1rem'
}

// Khmer falls through to Noto Sans Khmer (self-hosted via @fontsource, see main.ts) in every stack.
export const FONT_STACKS: Record<SiteTheme['font'], string> = {
  sans: "'Plus Jakarta Sans', 'Noto Sans Khmer', ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, 'Noto Sans Khmer', 'Times New Roman', serif",
  rounded: "ui-rounded, 'Nunito', 'Noto Sans Khmer', system-ui, sans-serif"
}

export const DEFAULT_THEME: SiteTheme = { primary: '#176b5b', accent: '#c98a2b', radius: 'md', font: 'sans' }

// White or near-black text, whichever reads better on `hex` (WCAG luminance).
export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return l > 0.4 ? '#17201d' : '#ffffff'
}

export function themeVars(theme: SiteTheme): Record<string, string> {
  return {
    '--site-primary': theme.primary,
    '--site-on-primary': readableOn(theme.primary),
    '--site-accent': theme.accent,
    '--site-on-accent': readableOn(theme.accent),
    '--site-radius': RADIUS_VALUES[theme.radius],
    fontFamily: FONT_STACKS[theme.font]
  }
}
