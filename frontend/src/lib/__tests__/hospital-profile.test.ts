import { describe, expect, it } from 'vitest'

import { formatAddress, formatHours, isBlank, isOpenNow, profileCompleteness, toUpdatePayload } from '../hospital-profile'

describe('isBlank', () => {
  it('treats empty values and the API placeholders as nothing entered', () => {
    for (const v of [null, undefined, '', '  ', 'Not set yet', 'NO COVER', 'null']) expect(isBlank(v)).toBe(true)
    for (const v of ['Phnom Penh', '0', 'No Name Clinic']) expect(isBlank(v)).toBe(false)
  })
})

describe('formatAddress', () => {
  it('joins the parts with commas and does not repeat the unit words', () => {
    expect(formatAddress({ village: 'Village 1', commune: 'Commune 1', district: 'District 1', province: 'Phnom Penh' })).toBe(
      'Village 1, Commune 1, District 1, Phnom Penh'
    )
  })
  it('starts with the street (either field name) and drops empty/placeholder parts', () => {
    expect(formatAddress({ street_address: '12 Street 20', village: '', commune: 'Not set yet', province: 'Siem Reap' })).toBe('12 Street 20, Siem Reap')
    expect(formatAddress({ street: '9 Main', province: 'Kep' })).toBe('9 Main, Kep')
  })
  it('is empty when nothing is known', () => {
    expect(formatAddress({})).toBe('')
  })
})

describe('formatHours', () => {
  it('knows a full range, a one-sided range, and nothing', () => {
    expect(formatHours('08:00', '17:00')).toEqual({ kind: 'range', open: '08:00', close: '17:00' })
    expect(formatHours('08:00:00', '17:30:00')).toEqual({ kind: 'range', open: '08:00', close: '17:30' })
    expect(formatHours('08:00', null)).toEqual({ kind: 'from', open: '08:00' })
    expect(formatHours(null, '17:00')).toEqual({ kind: 'until', close: '17:00' })
    expect(formatHours(null, undefined)).toEqual({ kind: 'none' })
    expect(formatHours('soon', 'later')).toEqual({ kind: 'none' })
  })
})

describe('isOpenNow (hospital time = Cambodia, UTC+7)', () => {
  const at = (utc: string) => new Date(`2026-10-05T${utc}:00.000Z`) // 03:00Z = 10:00 local
  it('is true inside the hours and false outside, including the edges (open inclusive, close exclusive)', () => {
    expect(isOpenNow('08:00', '17:00', at('03:00'))).toBe(true)
    expect(isOpenNow('08:00', '17:00', at('01:00'))).toBe(true) // 08:00 local
    expect(isOpenNow('08:00', '17:00', at('10:00'))).toBe(false) // 17:00 local
    expect(isOpenNow('08:00', '17:00', at('00:59'))).toBe(false) // 07:59 local
  })
  it('uses the hospital clock, not the viewer\'s', () => {
    // 20:00Z on the 5th is 03:00 on the 6th in Phnom Penh
    expect(isOpenNow('08:00', '17:00', at('20:00'))).toBe(false)
  })
  it('handles overnight hours', () => {
    expect(isOpenNow('20:00', '06:00', at('14:00'))).toBe(true) // 21:00 local
    expect(isOpenNow('20:00', '06:00', at('20:00'))).toBe(true) // 03:00 local
    expect(isOpenNow('20:00', '06:00', at('03:00'))).toBe(false) // 10:00 local
  })
  it('equal open and close means always open; unknown hours mean unknown', () => {
    expect(isOpenNow('00:00', '00:00', at('03:00'))).toBe(true)
    expect(isOpenNow(null, '17:00')).toBeNull()
    expect(isOpenNow('08:00', undefined)).toBeNull()
  })
})

describe('profileCompleteness', () => {
  const full = {
    cover_image: 'http://x/cover.jpg', phone_number: '012 345 678', open_time: '08:00', close_time: '17:00',
    province: 'Phnom Penh', village: 'Village 1', mission: 'm', vision: 'v', department: [{ id: 1 }]
  }

  it('is complete when every item is done', () => {
    const c = profileCompleteness(full, 2)
    expect(c).toMatchObject({ done: 7, total: 7, percent: 100, complete: true })
  })

  it('lists what is missing; placeholders and blanks do not count', () => {
    const c = profileCompleteness({ cover_image: 'No Cover', phone_number: '', open_time: '08:00', close_time: null, province: 'Kep', department: [], mission: 'm' }, 0)
    expect(c.items.filter((i) => !i.done).map((i) => i.key)).toEqual(['cover', 'phone', 'hours', 'address', 'story', 'departments', 'services'])
    expect(c.percent).toBe(0)
  })

  it('hours need both ends; the story needs both mission and vision; address needs more than a province', () => {
    expect(profileCompleteness({ ...full, close_time: null }, 1).items.find((i) => i.key === 'hours')!.done).toBe(false)
    expect(profileCompleteness({ ...full, vision: '' }, 1).items.find((i) => i.key === 'story')!.done).toBe(false)
    expect(profileCompleteness({ ...full, village: '', street: null }, 1).items.find((i) => i.key === 'address')!.done).toBe(false)
  })

  it('rounds the percentage', () => {
    expect(profileCompleteness({ ...full, cover_image: null, phone_number: null }, 1).percent).toBe(71) // 5 of 7
  })
})

describe('toUpdatePayload', () => {
  const form = {
    name: '  Sunrise ', category_id: '3', phone_number: ' 012 345 678 ', street_address: '', village: 'Village 1', commune: 'Not set yet',
    district: 'D1', province: 'Phnom Penh', latitude: '11.5', longitude: '', open_time: '08:00:00', close_time: '', mission: 'm', vision: null
  }

  it('sends the phone number (it used to be dropped) and uses the API field names', () => {
    const p = toUpdatePayload(form)
    expect(p.phoneNumber).toBe('012 345 678')
    expect(p).toMatchObject({ name: 'Sunrise', categoryId: 3, village: 'Village 1', district: 'D1', province: 'Phnom Penh', latitude: '11.5', mission: 'm' })
  })

  it('leaves out blank values and placeholders instead of sending empty strings', () => {
    const p = toUpdatePayload(form)
    for (const key of ['streetAddress', 'commune', 'longitude', 'closeTime', 'vision'] as const) expect(p[key]).toBeUndefined()
  })

  it('normalises times to HH:mm and ignores garbage', () => {
    expect(toUpdatePayload(form).openTime).toBe('08:00')
    expect(toUpdatePayload({ ...form, open_time: '8am' }).openTime).toBeUndefined()
  })
})
