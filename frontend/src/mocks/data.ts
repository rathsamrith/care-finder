// Fixtures for preview mode. Shapes mirror the real API responses (see
// backend hospitals.service.ts mapSummary/mapDetail and sites.service.ts),
// so screens behave the same against mocks and the live backend.
import type { PublicSite, SiteSection } from '@/components/site/catalog'

export const categories = [
  { id: 1, name: 'General Hospital', description: 'Full-service hospitals with emergency care.' },
  { id: 2, name: 'Specialty Clinic', description: 'Focused clinics for specific conditions.' },
  { id: 3, name: 'Pediatrics', description: 'Care for infants, children and teens.' }
]

const hospital = (
  id: number,
  name: string,
  categoryId: number,
  province: string,
  lat: string,
  lng: string,
  rating: number
) => ({
  id,
  name,
  cover_image: 'No Cover',
  phone_number: `023 ${900000 + id * 111}`,
  street_address: `${id * 12} Street ${id * 20}`,
  street: `${id * 12} Street ${id * 20}`,
  village: 'Phum 1',
  commune: 'Sangkat Boeung Keng Kang',
  district: 'Chamkar Mon',
  province,
  latitude: lat,
  longitude: lng,
  open_time: '08:00',
  close_time: '17:00',
  average_rating: rating,
  review_count: 12 + id,
  photo_count: 4,
  mission: 'To deliver compassionate, affordable and accessible healthcare to every community we serve.',
  vision: 'The most trusted healthcare partner in Cambodia.',
  category: categories.find((c) => c.id === categoryId)
})

export const hospitals = [
  hospital(1, 'Sunrise General Hospital', 1, 'Phnom Penh', '11.5564', '104.9282', 4.6),
  hospital(2, 'Angkor Family Clinic', 2, 'Siem Reap', '13.3671', '103.8448', 4.3),
  hospital(3, 'Little Lotus Children Care', 3, 'Phnom Penh', '11.5449', '104.8922', 4.8)
]

export const doctors = [
  { id: 1, first_name: 'Sokha', last_name: 'Chan', profile: 'No profile', role: 'Cardiologist' },
  { id: 2, first_name: 'Dara', last_name: 'Vann', profile: 'No profile', role: 'Pediatrician' },
  { id: 3, first_name: 'Sreyneang', last_name: 'Kim', profile: 'No profile', role: 'Surgeon' }
]

export const departments = [
  { id: 1, name: 'Cardiology', description: 'Heart and vascular care.', image: 'No profile' },
  { id: 2, name: 'Pediatrics', description: 'Care for children of all ages.', image: 'No profile' },
  { id: 3, name: 'Emergency', description: '24/7 emergency response.', image: 'No profile' }
]

export const services = [
  { id: 1, hospitalId: 1, name: 'Health check-up', description: 'Comprehensive annual screening packages.', image: null },
  { id: 2, hospitalId: 1, name: 'Maternity care', description: 'Prenatal, delivery and postnatal support.', image: null },
  { id: 3, hospitalId: 1, name: 'Laboratory', description: 'Same-day results for common tests.', image: null }
]

export const promotions = [
  {
    id: 1,
    hospitalId: 1,
    title: 'Free dental screening',
    description: 'Every Saturday this month.',
    image: null,
    start_date: '2026-09-01',
    end_date: '2026-12-31',
    hospital: { id: 1, name: hospitals[0].name, cover_image: 'No Cover' }
  }
]

export const feedbacks = [
  {
    id: 1,
    content: 'Friendly staff and short waiting time.',
    star: 5,
    created_at: '2026-09-20T09:00:00.000Z',
    user: { full_name: 'Dara Sok' },
    from: { profile: 'No profile' },
    replies: []
  },
  {
    id: 2,
    content: 'Clean facility and clear explanations from the doctor.',
    star: 4,
    created_at: '2026-09-12T09:00:00.000Z',
    user: { full_name: 'Sophea Lim' },
    from: { profile: 'No profile' },
    replies: []
  }
]

export const hospitalDetail = (id: number) => {
  const base = hospitals.find((h) => h.id === id) ?? hospitals[0]
  return { ...base, doctors, department: departments, feedbacks, appointment: [], rooms: [] }
}

export const subscribePlans = [
  { id: 1, name: 'Basic', price: 0, currency: 'usd', duration: 30 },
  { id: 2, name: 'Premium', price: 29, currency: 'usd', duration: 30 }
]

export const appointmentSummary = { pending: 3, confirmed: 8, canceled: 1, rejected: 0, missing: 1, today: 4, confirm: 8 }

export const previewUsers = {
  user: {
    id: 10,
    first_name: 'Dara',
    last_name: 'Sok',
    name: 'Dara Sok',
    email: 'user@preview.test',
    profile: 'No profile',
    roles: ['user'],
    permissions: [],
    hospital: null
  },
  hospital: {
    id: 11,
    first_name: 'Sunrise',
    last_name: 'Admin',
    name: 'Sunrise Admin',
    email: 'hospital@preview.test',
    profile: 'No profile',
    roles: ['hospital'],
    permissions: [],
    hospital: hospitals[0],
    hospitals: hospitals.slice(0, 2).map((h) => ({ id: h.id, name: h.name, slug: null, province: h.province }))
  },
  doctor: {
    id: 12,
    first_name: 'Sokha',
    last_name: 'Chan',
    name: 'Sokha Chan',
    email: 'doctor@preview.test',
    profile: 'No profile',
    roles: ['doctor'],
    permissions: [],
    hospital: null,
    doctor: { id: 1, hospitalId: 1 }
  },
  admin: {
    id: 13,
    first_name: 'Site',
    last_name: 'Admin',
    name: 'Site Admin',
    email: 'admin@preview.test',
    profile: 'No profile',
    roles: ['admin'],
    permissions: [],
    hospital: null
  }
}

// ---- Hospital site (subdomain website) ---------------------------------------

export const SAMPLE_SLUG = 'demo-hospital'

const defaultSections: SiteSection[] = [
  { type: 'hero', enabled: true },
  { type: 'about', enabled: true },
  { type: 'services', enabled: true },
  { type: 'departments', enabled: true },
  { type: 'doctors', enabled: true },
  { type: 'reviews', enabled: true },
  { type: 'contact', enabled: true }
]

export const createSiteState = () => ({
  slug: SAMPLE_SLUG as string | null,
  logo: null as string | null,
  entitled: true,
  template: 'classic' as PublicSite['site']['template'],
  theme: { primary: '#176b5b', accent: '#c98a2b', radius: 'md', font: 'sans' } as PublicSite['site']['theme'],
  sections: defaultSections.map((s) => ({ ...s })),
  heroImage: null as string | null,
  heroTitle: 'Care you can trust, close to home' as string | null,
  heroSubtitle: 'Modern healthcare for your whole family.' as string | null,
  seoTitle: null as string | null,
  seoDescription: null as string | null,
  published: true
})

export type SiteState = ReturnType<typeof createSiteState>

export const publicSitePayload = (state: SiteState): PublicSite => {
  const h = hospitals[0]
  return {
    slug: state.slug,
    hospitalId: h.id,
    name: h.name,
    logo: state.logo,
    coverImage: null,
    category: h.category?.name ?? null,
    phoneNumber: h.phone_number,
    openTime: '1970-01-01T08:00:00.000Z',
    closeTime: '1970-01-01T17:00:00.000Z',
    mission: h.mission,
    vision: h.vision,
    address: {
      street: h.street_address,
      village: h.village,
      commune: h.commune,
      district: h.district,
      province: h.province,
      latitude: h.latitude,
      longitude: h.longitude
    },
    site: {
      template: state.template,
      theme: state.theme,
      sections: state.sections,
      heroImage: state.heroImage,
      heroTitle: state.heroTitle,
      heroSubtitle: state.heroSubtitle,
      seoTitle: state.seoTitle,
      seoDescription: state.seoDescription
    },
    rating: { average: h.average_rating, count: feedbacks.length },
    services: services.map((s) => ({ id: s.id, name: s.name, description: s.description, image: null })),
    departments: departments.map((d) => ({ id: d.id, name: d.name, details: d.description, image: null })),
    doctors: doctors.map((d) => ({ id: d.id, name: `Dr ${d.first_name} ${d.last_name}`, profile: null })),
    gallery: [],
    promotions: promotions.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      image: null,
      startDate: p.start_date,
      endDate: p.end_date
    })),
    reviews: feedbacks.map((f) => ({ id: f.id, author: f.user.full_name.split(' ')[0], star: f.star, content: f.content }))
  }
}

// ---- Organization / team (preview mode) --------------------------------------

export const createTeamState = () => ({
  members: [
    { userId: 11, name: 'Sunrise Admin', email: 'hospital@preview.test', role: 'Owner' as const },
    { userId: 21, name: 'Dara Sok', email: 'dara@preview.test', role: 'Admin' as const },
    { userId: 22, name: 'Sophea Lim', email: 'sophea@preview.test', role: 'Manager' as const }
  ],
  invites: [] as { id: number; email: string; role: 'Admin' | 'Manager'; expiresAt: string }[],
  nextId: 100
})
export type TeamState = ReturnType<typeof createTeamState>
