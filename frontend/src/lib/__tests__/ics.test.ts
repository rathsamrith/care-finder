import { describe, expect, it } from 'vitest'

import { buildIcs } from '../ics'

const NOW = new Date('2026-10-01T03:04:05.678Z')
const base = { uid: 'CF-000007', title: 'Checkup - Sunrise', date: '2026-10-05', start: '10:00' }
const lines = (ics: string) => ics.trimEnd().split('\r\n')

describe('buildIcs', () => {
  it('produces a valid single-event calendar with CRLF line endings', () => {
    const ics = buildIcs({ ...base, end: '10:30' }, NOW)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        'VERSION:2.0',
        'UID:CF-000007@carefinder',
        'DTSTAMP:20261001T030405Z',
        'DTSTART:20261005T100000',
        'DTEND:20261005T103000',
        'SUMMARY:Checkup - Sunrise',
        'TRIGGER:-PT60M'
      ])
    )
  })

  it('writes floating local times (no Z, no timezone) so it lands at 10:00 where the hospital is', () => {
    const ics = buildIcs(base, NOW)
    expect(lines(ics).find((l) => l.startsWith('DTSTART'))).toBe('DTSTART:20261005T100000')
  })

  it('defaults to a 30-minute event when there is no (or a nonsensical) end', () => {
    expect(lines(buildIcs(base, NOW))).toContain('DTEND:20261005T103000')
    expect(lines(buildIcs({ ...base, end: null }, NOW))).toContain('DTEND:20261005T103000')
    expect(lines(buildIcs({ ...base, end: '09:00' }, NOW))).toContain('DTEND:20261005T103000') // end before start
    expect(lines(buildIcs({ ...base, start: '23:45' }, NOW))).toContain('DTEND:20261005T001500') // wraps past midnight
  })

  it('escapes commas, semicolons, backslashes and newlines in text', () => {
    const ics = buildIcs({ ...base, location: 'Street 271, Phnom Penh; Cambodia', description: 'Code: 7-ABCD\nBring ID \\ card' }, NOW)
    expect(lines(ics)).toContain('LOCATION:Street 271\\, Phnom Penh\\; Cambodia')
    expect(lines(ics)).toContain('DESCRIPTION:Code: 7-ABCD\\nBring ID \\\\ card')
  })

  it('leaves out location/description when not given, and honors a custom reminder', () => {
    const ics = buildIcs({ ...base, alarmMinutes: 120 }, NOW)
    expect(ics).not.toContain('LOCATION:')
    expect(lines(ics).filter((l) => l.startsWith('DESCRIPTION:'))).toHaveLength(1) // only the alarm's
    expect(lines(ics)).toContain('TRIGGER:-PT120M')
  })

  it('folds long lines at 75 bytes without splitting multi-byte (Khmer) characters', () => {
    const khmer = 'ការណាត់ជួបនៅមន្ទីរពេទ្យ '.repeat(8)
    const ics = buildIcs({ ...base, description: khmer }, NOW)
    const raw = ics.split('\r\n')
    const encoder = new TextEncoder()
    expect(raw.every((l) => encoder.encode(l).length <= 75)).toBe(true)
    // unfolding gives the original text back
    const unfolded = ics.replace(/\r\n /g, '')
    expect(unfolded).toContain(`DESCRIPTION:${khmer}`)
    expect(unfolded).not.toContain('�')
  })
})
