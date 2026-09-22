import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import i18n from '@/i18n'

import { TEMPLATES, type PublicSite } from '../catalog'
import SiteRenderer from '../site-renderer.vue'

const base = (template: PublicSite['site']['template'], overrides: Partial<PublicSite> = {}): PublicSite => ({
  slug: 'city-hospital',
  hospitalId: 7,
  name: 'City Hospital',
  logo: null,
  coverImage: null,
  category: 'General',
  phoneNumber: '012 345 678',
  openTime: '1970-01-01T08:00:00.000Z',
  closeTime: '1970-01-01T17:30:00.000Z',
  mission: 'Care for all',
  vision: null,
  address: { street: '1 Main St', village: null, commune: null, district: null, province: 'Phnom Penh', latitude: '11.5', longitude: '104.9' },
  site: {
    template,
    theme: { primary: '#176b5b', accent: '#c98a2b', radius: 'md', font: 'sans' },
    sections: [
      { type: 'hero', enabled: true },
      { type: 'about', enabled: true },
      { type: 'services', enabled: true },
      { type: 'doctors', enabled: false },
      { type: 'reviews', enabled: true },
      { type: 'contact', enabled: true, title: 'Find us' }
    ],
    heroImage: null,
    heroTitle: null,
    heroSubtitle: null,
    seoTitle: null,
    seoDescription: null
  },
  rating: { average: 4.5, count: 2 },
  services: [{ id: 1, name: 'Cardiology', description: 'Heart care', image: null }],
  departments: [],
  doctors: [{ id: 1, name: 'Dr Sok', profile: null }],
  gallery: [],
  promotions: [],
  reviews: [{ id: 1, author: 'Dara', star: 5, content: 'Great staff' }],
  ...overrides
})

const render = (data: PublicSite) => mount(SiteRenderer, { props: { data }, global: { plugins: [i18n] } })

describe('SiteRenderer', () => {
  it.each(TEMPLATES)('renders the %s template with enabled, non-empty sections only', (template) => {
    const w = render(base(template))
    expect(w.text()).toContain('City Hospital')
    expect(w.find('#sec-about').exists()).toBe(true)
    expect(w.find('#sec-services').text()).toContain('Cardiology')
    expect(w.find('#sec-reviews').text()).toContain('Great staff')
    expect(w.find('#sec-contact').text()).toContain('Find us') // custom title wins
    expect(w.find('#sec-contact').text()).toContain('08:00 - 17:30')
    expect(w.find('#sec-doctors').exists()).toBe(false) // disabled
    expect(w.find('#sec-gallery').exists()).toBe(false) // not configured
  })

  it('applies the hospital theme as scoped CSS variables', () => {
    const w = render(base('classic'))
    const style = w.element.getAttribute('style') ?? ''
    expect(style).toContain('--site-primary: #176b5b')
    expect(style).toContain('--site-on-primary: #ffffff')
  })

  it('skips empty sections instead of rendering bare headings', () => {
    const w = render(base('classic', { services: [], mission: null }))
    expect(w.find('#sec-services').exists()).toBe(false)
    expect(w.find('#sec-about').exists()).toBe(false)
  })

  it('links booking to the main app, never renders provided text as HTML', () => {
    const w = render(base('classic', { name: '<img src=x onerror=alert(1)>' }))
    expect(w.html()).not.toContain('<img src="x"')
    expect(w.find('a[href*="/hospital/detail?id=7"]').exists()).toBe(true)
  })
})
