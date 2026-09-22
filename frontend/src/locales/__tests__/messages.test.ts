import { afterEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '../en.json'
import km from '../km.json'

const flatten = (obj: Record<string, any>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  )

describe('every message compiles', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Characters like "@" (linked messages) and "|" (plural forms) are special in
  // vue-i18n; an unescaped one makes a message fail to compile and render wrong.
  it.each([
    ['en', en],
    ['km', km]
  ])('%s has no compilation errors', (locale, messages) => {
    const problems: string[] = []
    const capture = (...args: unknown[]) => {
      const text = args.map(String).join(' ')
      if (/compilation error|Not found|Invalid linked/i.test(text)) problems.push(text)
    }
    vi.spyOn(console, 'warn').mockImplementation(capture)
    vi.spyOn(console, 'error').mockImplementation(capture)

    const i18n = createI18n({ legacy: false, locale, fallbackLocale: locale, messages: { [locale]: messages } })
    const failed: string[] = []
    for (const key of flatten(messages)) {
      const before = problems.length
      i18n.global.t(key, { count: 2, n: 2, date: 'D', email: 'e', name: 'N', hospital: 'H' })
      if (problems.length > before) failed.push(key)
    }
    expect(failed).toEqual([])
  })

  it('placeholders keep a literal @', () => {
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
    expect(i18n.global.t('auth.emailPlaceholder')).toBe('you@example.com')
    expect(i18n.global.t('team.emailPlaceholder')).toBe('name@example.com')
  })

  it('toasts that interpolate a value show the value (not a plural form)', () => {
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
    expect(i18n.global.t('hospitalDetail.calendar.appointmentToast', { date: '2026-10-01' })).toBe('Appointment: 2026-10-01')
  })
})
