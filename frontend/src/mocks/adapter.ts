// Axios adapter used in preview mode (VITE_APP_MODE=preview): answers requests
// from fixtures instead of the network. Reads are served from data.ts;
// writes succeed and, where a screen needs to see its own change (the site
// editor), update in-memory state that lasts until the page reloads.
import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

import {
  SAMPLE_SLUG,
  appointmentSummary,
  categories,
  createSiteState,
  createTeamState,
  departments,
  doctors,
  feedbacks,
  hospitalDetail,
  hospitals,
  previewUsers,
  promotions,
  publicSitePayload,
  services,
  subscribePlans
} from './data'

interface MockRequest {
  params: Record<string, string>
  query: Record<string, unknown>
  body: any
  header: (name: string) => string | undefined
}
type Handler = (req: MockRequest) => unknown
type Method = 'get' | 'post' | 'put' | 'delete' | 'patch'

class MockHttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

const LATENCY_MS = 120
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'mail', 'static', 'assets', 'dashboard', 'login'])
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/

let site = createSiteState()
let team = createTeamState()
// Check-in demo state (preview mode): today's queue, kiosks, and a running queue number.
interface DemoVisit { id: number; status: string; queue_label: string | null; title: string; time: string; patient: [string, string]; doctor: [string, string]; room: string | null }
const freshVisits = (): DemoVisit[] => [
  { id: 101, status: 'Arrived', queue_label: 'B-1', title: 'Heart check', time: '09:00', patient: ['Sokha', 'Chan'], doctor: ['Dara', 'Vann'], room: 'Room 204' },
  { id: 102, status: 'Confirmed', queue_label: null, title: 'Follow-up', time: '10:30', patient: ['Sophea', 'Lim'], doctor: ['Dara', 'Vann'], room: 'Room 204' },
  { id: 103, status: 'Confirmed', queue_label: null, title: 'Vaccination', time: '11:00', patient: ['Vuthy', 'Keo'], doctor: ['Sreyneang', 'Kim'], room: null }
]
let visits = freshVisits()
let queueCounter = 1
let kiosks: { id: number; name: string; prefix: string; lastSeenAt: string | null }[] = [
  { id: 1, name: 'Main entrance', prefix: 'A', lastSeenAt: null }
]
let nextKioskId = 2
const demoTicket = (label: string, over: object = {}) => ({
  appointmentId: 102, alreadyCheckedIn: false, status: 'Arrived', queueLabel: label, queueNumber: queueCounter,
  patientFirstName: 'Sophea', hospital: 'Sunrise General Hospital', doctor: 'Dara Vann', room: 'Room 204', title: 'Follow-up',
  appointmentTime: '10:30', peopleAhead: 1, estimatedWaitMinutes: 30, ...over
})
const queuePayload = () => ({
  date: new Date().toISOString().slice(0, 10),
  counts: {
    waiting: visits.filter((v) => v.status === 'Arrived').length,
    expected: visits.filter((v) => v.status === 'Confirmed').length,
    completed: visits.filter((v) => v.status === 'Completed').length,
    missing: visits.filter((v) => v.status === 'Missing').length
  },
  items: [...visits]
    .sort((a, b) => ['Arrived', 'Confirmed', 'Completed', 'Missing'].indexOf(a.status) - ['Arrived', 'Confirmed', 'Completed', 'Missing'].indexOf(b.status))
    .map((v) => ({
      id: v.id, status: v.status, title: v.title, queue_label: v.queue_label, appointment_time: `1970-01-01T${v.time}:00.000Z`,
      room: v.room ? { name: v.room } : null, doctor: { first_name: v.doctor[0], last_name: v.doctor[1] },
      user: { first_name: v.patient[0], last_name: v.patient[1] }
    }))
})

let schedules: Record<string, { weekday: number; intervals: { start: string; end: string }[] }[]> = {}

export const resetMockState = () => {
  site = createSiteState()
  team = createTeamState()
  schedules = {}
  visits = freshVisits()
  queueCounter = 1
  kiosks = [{ id: 1, name: 'Main entrance', prefix: 'A', lastSeenAt: null }]
  nextKioskId = 2
}

const previewRole = (): keyof typeof previewUsers => {
  const role = import.meta.env.VITE_PREVIEW_ROLE as string | undefined
  return role && role in previewUsers ? (role as keyof typeof previewUsers) : 'hospital'
}

const slugCheck = (slug: string) => {
  const s = slug.trim().toLowerCase()
  if (!SLUG_RE.test(s) || s.includes('--')) {
    return { slug: s, available: false, reason: 'Slug must be 3-40 characters: lowercase letters, numbers and hyphens' }
  }
  if (RESERVED.has(s)) return { slug: s, available: false, reason: 'This address is reserved' }
  if (s === SAMPLE_SLUG && site.slug !== s) return { slug: s, available: false, reason: 'This address is already taken' }
  return { slug: s, available: true }
}

const editorPayload = () => ({
  hospitalId: hospitals[0].id,
  name: hospitals[0].name,
  suggestedSlug: SAMPLE_SLUG,
  ...site
})

const routes: [Method, RegExp, Handler][] = [
  // auth
  ['post', /^\/login$/, () => ({ accessToken: 'preview-token' })],
  ['post', /^\/register$/, () => ({ accessToken: 'preview-token' })],
  [
    'get',
    /^\/(me|profile)$/,
    ({ header }) => {
      if (!localStorage.getItem('access_token')) throw new MockHttpError(401, 'Unauthenticated')
      const user = previewUsers[previewRole()]
      // Hospital accounts: the active hospital follows X-Hospital-Id, like the real API.
      if ('hospitals' in user && user.hospitals) {
        const chosen = hospitals.find((h) => String(h.id) === header('X-Hospital-Id') && user.hospitals.some((s) => s.id === h.id))
        return { ...user, hospital: chosen ?? user.hospital }
      }
      return user
    }
  ],

  // discovery
  ['get', /^\/hospitals(\/list)?$/, () => hospitals],
  ['get', /^\/hospitals\/show\/(?<id>\d+)$/, ({ params }) => hospitalDetail(Number(params.id))],
  ['get', /^\/hospitals\/(?<id>\d+)$/, ({ params }) => hospitalDetail(Number(params.id))],
  ['get', /^\/categories(\/list)?$/, () => categories],
  ['get', /^\/doctors$/, () => doctors],
  ['get', /^\/hospital-services$/, () => services],
  ['get', /^\/hospital-promotions(\/public)?$/, () => promotions],
  ['get', /^\/preview-images$/, () => []],
  // Home page "top hospitals": [{ hospital, total_star }] (not review rows).
  [
    'get',
    /^\/rates\/most-rated$/,
    () =>
      [...hospitals]
        .sort((a, b) => b.average_rating - a.average_rating)
        .map((h) => ({ hospital: h, total_star: h.average_rating }))
  ],
  ['get', /^\/rates(\/recent|\/monthly)?$/, () => feedbacks],
  ['get', /^\/subscribe-plans$/, () => subscribePlans],
  ['get', /^\/appointments\/summary$/, () => appointmentSummary],
  [
    'get',
    /^\/appointments\/availability$/,
    ({ query }) => {
      // 08:00-17:00 in 30-minute slots; a couple of fixed busy ones for the demo.
      const busy = new Set(['09:00', '10:30', '14:00'])
      const slots = Array.from({ length: 18 }, (_, i) => {
        const m = 8 * 60 + i * 30
        const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
        return { time, available: !busy.has(time) }
      })
      return { doctorId: query.doctorId, date: query.date, slotMinutes: 30, open: '08:00', close: '17:00', busy: [], slots }
    }
  ],
  ['post', /^\/(forget-password|reset-password)$/, () => ({ message: 'Preview mode: no email is sent' })],
  // ---- check-in: patient, reception/doctor queue, kiosks ----------------------------
  ['get', /^\/appointments\/queue$/, () => queuePayload()],
  [
    'post',
    /^\/appointments\/(?<id>\d+)\/arrive$/,
    ({ params }) => {
      const v = visits.find((x) => x.id === Number(params.id))
      if (!v) throw new MockHttpError(404, 'Appointment not found')
      if (v.status !== 'Arrived') {
        queueCounter += 1
        Object.assign(v, { status: 'Arrived', queue_label: `R-${queueCounter}` })
      }
      return demoTicket(v.queue_label!)
    }
  ],
  [
    'put',
    /^\/appointments\/(?<id>\d+)\/complete$/,
    ({ params }) => {
      const v = visits.find((x) => x.id === Number(params.id))
      if (!v) throw new MockHttpError(404, 'Appointment not found')
      v.status = 'Completed'
      return demoTicket(v.queue_label ?? 'R-0', { status: 'Completed' })
    }
  ],
  [
    'get',
    /^\/appointments\/(?<id>\d+)\/check-in-code$/,
    ({ params }) => ({
      code: `${Number(params.id).toString(36).toUpperCase()}-DEMO-CODE`,
      status: 'Confirmed',
      window: 'open',
      opensAt: '09:00',
      closesAt: '23:59',
      ticket: null,
      appointment: {
        reference: `CF-${String(params.id).padStart(6, '0')}`,
        title: 'Follow-up',
        patientName: 'Sophea Lim',
        hospital: 'Sunrise General Hospital',
        hospitalAddress: '12 Street 20, Chamkar Mon, Phnom Penh',
        doctor: 'Dara Vann',
        room: 'Room 204',
        date: new Date().toISOString().slice(0, 10),
        time: '10:30',
        endTime: '11:00',
        arriveBy: '10:15'
      }
    })
  ],
  [
    'post',
    /^\/appointments\/\d+\/check-in$/,
    ({ body }) => {
      if (!Number.isFinite(Number(body.latitude)) || !Number.isFinite(Number(body.longitude))) {
        throw new MockHttpError(400, 'Your location is needed to check in from your phone.')
      }
      queueCounter += 1
      return demoTicket(`P-${queueCounter}`)
    }
  ],
  ['get', /^\/hospitals\/\d+\/kiosks$/, () => kiosks],
  [
    'post',
    /^\/hospitals\/\d+\/kiosks$/,
    ({ body }) => {
      if (kiosks.length >= 10) throw new MockHttpError(409, 'A hospital can have at most 10 kiosks')
      const kiosk = { id: nextKioskId++, name: String(body.name), prefix: String(body.prefix).toUpperCase(), lastSeenAt: null }
      kiosks.push(kiosk)
      return { ...kiosk, key: `kk_${'0123456789abcdef'.repeat(4)}` }
    }
  ],
  [
    'delete',
    /^\/hospitals\/\d+\/kiosks\/(?<id>\d+)$/,
    ({ params }) => {
      kiosks = kiosks.filter((k) => k.id !== Number(params.id))
      return { message: 'Kiosk revoked' }
    }
  ],
  [
    'get',
    /^\/kiosk\/me$/,
    ({ header }) => {
      if (!/^kk_[a-f0-9]{64}$/.test(header('X-Kiosk-Key') ?? '')) throw new MockHttpError(401, 'Invalid kiosk key')
      return { name: 'Main entrance', prefix: 'A', hospital: { id: 1, name: 'Sunrise General Hospital' } }
    }
  ],
  [
    'post',
    /^\/kiosk\/check-in$/,
    ({ body, header }) => {
      if (!/^kk_[a-f0-9]{64}$/.test(header('X-Kiosk-Key') ?? '')) throw new MockHttpError(401, 'Invalid kiosk key')
      if (!String(body.code ?? '').trim() || String(body.code).toUpperCase() === 'BAD') {
        throw new MockHttpError(400, 'This code is not valid. Please ask reception for help.')
      }
      queueCounter += 1
      return demoTicket(`A-${queueCounter}`)
    }
  ],
  ['get', /^\/(posts|favourites|user-addresses|system-requests|subscription\/list)$/, () => []],
  ['get', /^\/(appointments\/[a-zA-Z/]+|appointment-notifications(\/unread)?)$/, () => []],
  ['get', /^\/system-requests\/categories$/, () => []],

  // doctor working hours (in memory; bookings in preview are not checked against them)
  ['get', /^\/doctors\/(?<id>\d+)\/schedule$/, ({ params }) => ({ doctorId: Number(params.id), days: schedules[params.id] ?? [] })],
  [
    'put',
    /^\/doctors\/(?<id>\d+)\/schedule$/,
    ({ params, body }) => {
      for (const day of body.days ?? []) {
        for (const i of day.intervals ?? []) {
          if (!(i.start < i.end)) throw new MockHttpError(400, `End time must be after start time (${i.start}-${i.end})`)
        }
      }
      schedules[params.id] = body.days ?? []
      return { doctorId: Number(params.id), days: schedules[params.id] }
    }
  ],

  // team / organization (the preview user is the Owner)
  [
    'get',
    /^\/organizations\/mine$/,
    () => ({
      id: 1,
      name: 'Sunrise Group',
      myRole: 'Owner',
      hospitals: hospitals.slice(0, 2).map((h) => ({ id: h.id, name: h.name })),
      members: team.members,
      invites: team.invites
    })
  ],
  [
    'post',
    /^\/organizations\/(?<org>\d+)\/invites$/,
    ({ body }) => {
      const email = String(body.email ?? '').trim().toLowerCase()
      if (team.members.some((m) => m.email === email)) throw new MockHttpError(409, 'This person is already a member')
      team.invites = team.invites.filter((i) => i.email !== email)
      const invite = { id: team.nextId++, email, role: body.role, expiresAt: new Date(Date.now() + 7 * 864e5).toISOString() }
      team.invites.push(invite)
      return { ...invite, emailSent: false, acceptUrl: `${window.location.origin}/accept-invite?t=${'a'.repeat(64)}&e=${encodeURIComponent(email)}` }
    }
  ],
  [
    'delete',
    /^\/organizations\/\d+\/invites\/(?<id>\d+)$/,
    ({ params }) => {
      team.invites = team.invites.filter((i) => i.id !== Number(params.id))
      return { message: 'Invitation revoked' }
    }
  ],
  [
    'put',
    /^\/organizations\/\d+\/members\/(?<id>\d+)$/,
    ({ params, body }) => {
      const m = team.members.find((x) => x.userId === Number(params.id))
      if (!m) throw new MockHttpError(404, 'Member not found')
      if (m.role === 'Owner' && body.role !== 'Owner' && team.members.filter((x) => x.role === 'Owner').length === 1) {
        throw new MockHttpError(409, 'An organization must keep at least one Owner')
      }
      m.role = body.role
      return { message: 'Role updated' }
    }
  ],
  [
    'delete',
    /^\/organizations\/\d+\/members\/(?<id>\d+)$/,
    ({ params }) => {
      const m = team.members.find((x) => x.userId === Number(params.id))
      if (m?.role === 'Owner' && team.members.filter((x) => x.role === 'Owner').length === 1) {
        throw new MockHttpError(409, 'An organization must keep at least one Owner')
      }
      team.members = team.members.filter((x) => x.userId !== Number(params.id))
      return { message: 'Member removed' }
    }
  ],
  ['post', /^\/organizations\/invites\/accept$/, () => ({ organizationId: 1, name: 'Sunrise Group', role: 'Manager' })],

  // hospital website (subdomain site + editor)
  [
    'get',
    /^\/sites\/slug-available$/,
    ({ query }) => slugCheck(String(query.slug ?? ''))
  ],
  [
    'get',
    /^\/sites\/(?<slug>[^/]+)$/,
    ({ params }) => {
      if (params.slug !== site.slug || !site.published) throw new MockHttpError(404, 'Site not found')
      return publicSitePayload(site)
    }
  ],
  ['get', /^\/hospitals\/\d+\/site$/, () => editorPayload()],
  ['get', /^\/hospitals\/\d+\/site\/preview$/, () => publicSitePayload(site)],
  [
    'put',
    /^\/hospitals\/\d+\/site$/,
    ({ body }) => {
      if (body.slug !== undefined) {
        const check = slugCheck(body.slug)
        if (!check.available) throw new MockHttpError(400, check.reason ?? 'Invalid slug')
        site.slug = check.slug
      }
      if (body.published && !site.slug) throw new MockHttpError(400, 'Choose a site address before publishing')
      for (const key of ['template', 'theme', 'sections', 'heroTitle', 'heroSubtitle', 'seoTitle', 'seoDescription', 'published'] as const) {
        if (body[key] !== undefined) (site as Record<string, unknown>)[key] = body[key]
      }
      return editorPayload()
    }
  ],
  ['post', /^\/hospitals\/\d+\/uploadLogo$/, () => ({ logo: site.logo })],
  ['post', /^\/hospitals\/\d+\/site\/hero$/, () => ({ heroImage: site.heroImage })]
]

const parseBody = (data: unknown) => {
  if (typeof data !== 'string') return data ?? {}
  try {
    return JSON.parse(data)
  } catch {
    return {}
  }
}

const respond = (config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse => ({
  data,
  status,
  statusText: String(status),
  headers: {},
  config,
  request: {}
})

export const mockAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toLowerCase() as Method
  const [rawPath, rawQuery = ''] = (config.url ?? '').split('?')
  const path = rawPath.replace(/\/+$/, '') || '/'
  const query: Record<string, unknown> = { ...Object.fromEntries(new URLSearchParams(rawQuery)), ...(config.params ?? {}) }

  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))

  try {
    for (const [routeMethod, pattern, handler] of routes) {
      if (routeMethod !== method) continue
      const match = pattern.exec(path)
      if (!match) continue
      const data = handler({
        params: { ...match.groups },
        query,
        body: parseBody(config.data),
        header: (name) => (config.headers as any)?.get?.(name) ?? undefined
      })
      return respond(config as InternalAxiosRequestConfig, method === 'post' ? 201 : 200, data)
    }
  } catch (error) {
    if (error instanceof MockHttpError) {
      const response = respond(config as InternalAxiosRequestConfig, error.status, { message: error.message })
      throw new AxiosError(error.message, String(error.status), config as InternalAxiosRequestConfig, {}, response)
    }
    throw error
  }

  // Unmapped endpoint: writes are accepted as no-ops, reads return an empty
  // list so screens render their empty states instead of erroring.
  console.warn(`[preview] no mock for ${method.toUpperCase()} ${path}`)
  return respond(config as InternalAxiosRequestConfig, 200, method === 'get' ? [] : { message: 'Preview mode: not saved' })
}
