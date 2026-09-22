// Helpers for the hospital's own profile page: how hours and address are shown,
// whether the hospital is open right now, how complete the profile is, and the
// request body for saving it. Pure functions so they are easy to test.

// Placeholder strings the API has used for "nothing entered".
const PLACEHOLDERS = new Set(['', 'not set yet', 'no cover', 'null', 'undefined'])
export const isBlank = (value: unknown): boolean =>
  value === null || value === undefined || PLACEHOLDERS.has(String(value).trim().toLowerCase())

// "Village 1, Commune 1, District 1, Phnom Penh" - parts that are empty or
// placeholders are dropped. (The unit words like "Village"/"Commune" are not
// appended: the values from the province data already carry them.)
export function formatAddress(h: {
  street_address?: string | null
  street?: string | null
  village?: string | null
  commune?: string | null
  district?: string | null
  province?: string | null
}): string {
  const street = h.street_address ?? h.street
  return [street, h.village, h.commune, h.district, h.province].filter((part) => !isBlank(part)).map((p) => String(p).trim()).join(', ')
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const isTime = (value: unknown): value is string => typeof value === 'string' && /^\d{2}:\d{2}/.test(value)

// "08:00 – 17:00"; with only one end known, say which; nothing when neither.
export function formatHours(open?: string | null, close?: string | null): { kind: 'range' | 'from' | 'until' | 'none'; open?: string; close?: string } {
  const o = isTime(open) ? open.slice(0, 5) : undefined
  const c = isTime(close) ? close.slice(0, 5) : undefined
  if (o && c) return { kind: 'range', open: o, close: c }
  if (o) return { kind: 'from', open: o }
  if (c) return { kind: 'until', close: c }
  return { kind: 'none' }
}

// Open right now? null when the hours are unknown. Uses the hospital's wall
// clock (Cambodia) rather than the viewer's, and handles overnight hours
// (e.g. 20:00 - 06:00).
export function isOpenNow(open?: string | null, close?: string | null, now: Date = new Date(), timeZone = 'Asia/Phnom_Penh'): boolean | null {
  if (!isTime(open) || !isTime(close)) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
  const hh = Number(parts.find((p) => p.type === 'hour')?.value) % 24
  const mm = Number(parts.find((p) => p.type === 'minute')?.value)
  const current = hh * 60 + mm
  const from = toMinutes(open)
  const to = toMinutes(close)
  if (from === to) return true // 24-hour
  return from < to ? current >= from && current < to : current >= from || current < to
}

export type CompletenessKey = 'cover' | 'phone' | 'hours' | 'address' | 'story' | 'departments' | 'services'

export interface CompletenessInput {
  cover_image?: string | null
  phone_number?: string | null
  open_time?: string | null
  close_time?: string | null
  province?: string | null
  street_address?: string | null
  street?: string | null
  village?: string | null
  commune?: string | null
  district?: string | null
  mission?: string | null
  vision?: string | null
  department?: unknown[] | null
}

// What a patient expects to find on a hospital's page, each item done or not.
export function profileCompleteness(h: CompletenessInput, serviceCount: number) {
  const items: { key: CompletenessKey; done: boolean }[] = [
    { key: 'cover', done: !isBlank(h.cover_image) },
    { key: 'phone', done: !isBlank(h.phone_number) },
    { key: 'hours', done: isTime(h.open_time) && isTime(h.close_time) },
    { key: 'address', done: !isBlank(h.province) && formatAddress(h).split(',').length >= 2 },
    { key: 'story', done: !isBlank(h.mission) && !isBlank(h.vision) },
    { key: 'departments', done: (h.department?.length ?? 0) > 0 },
    { key: 'services', done: serviceCount > 0 }
  ]
  const done = items.filter((i) => i.done).length
  return { items, done, total: items.length, percent: Math.round((done / items.length) * 100), complete: done === items.length }
}

export interface ProfileForm {
  name: string
  category_id: string | number
  phone_number?: string | null
  street_address?: string | null
  village?: string | null
  commune?: string | null
  district?: string | null
  province?: string | null
  latitude?: string | null
  longitude?: string | null
  open_time?: string | null
  close_time?: string | null
  mission?: string | null
  vision?: string | null
}

// Body for PUT /hospitals/:id. Blank optional values are left out: the API
// checks the time fields' format, so an empty string would be refused.
export function toUpdatePayload(form: ProfileForm) {
  const text = (v: string | null | undefined) => (isBlank(v) ? undefined : String(v).trim())
  const time = (v: string | null | undefined) => (isTime(v) ? v.slice(0, 5) : undefined)
  return {
    name: form.name.trim(),
    categoryId: Number(form.category_id),
    phoneNumber: text(form.phone_number),
    streetAddress: text(form.street_address),
    village: text(form.village),
    commune: text(form.commune),
    district: text(form.district),
    province: text(form.province),
    latitude: text(form.latitude),
    longitude: text(form.longitude),
    openTime: time(form.open_time),
    closeTime: time(form.close_time),
    mission: text(form.mission),
    vision: text(form.vision)
  }
}
