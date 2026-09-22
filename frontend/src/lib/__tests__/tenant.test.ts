import { describe, expect, it } from 'vitest'

import { resolveTenant } from '../tenant'

describe('resolveTenant', () => {
  it('extracts a single-label subdomain of the root domain', () => {
    expect(resolveTenant('city-hospital.carefinder.com', 'carefinder.com')).toBe('city-hospital')
    expect(resolveTenant('CITY-HOSPITAL.CareFinder.com', 'carefinder.com')).toBe('city-hospital')
    expect(resolveTenant('demo.localhost', 'localhost')).toBe('demo')
  })

  it('returns null for the root domain and platform labels', () => {
    expect(resolveTenant('carefinder.com', 'carefinder.com')).toBeNull()
    expect(resolveTenant('www.carefinder.com', 'carefinder.com')).toBeNull()
    expect(resolveTenant('app.carefinder.com', 'carefinder.com')).toBeNull()
    expect(resolveTenant('api.carefinder.com', 'carefinder.com')).toBeNull()
  })

  it('rejects nested, malformed and look-alike hosts', () => {
    expect(resolveTenant('a.b.carefinder.com', 'carefinder.com')).toBeNull()
    expect(resolveTenant('-bad.carefinder.com', 'carefinder.com')).toBeNull()
    expect(resolveTenant('x.carefinder.com', 'carefinder.com')).toBeNull() // too short
    expect(resolveTenant('evilcarefinder.com', 'carefinder.com')).toBeNull()
    expect(resolveTenant('city-hospital.carefinder.com.evil.com', 'carefinder.com')).toBeNull()
  })

  it('is off without a root domain, except for the dev ?site= override', () => {
    expect(resolveTenant('city-hospital.carefinder.com', undefined)).toBeNull()
    expect(resolveTenant('localhost', undefined, 'demo')).toBe('demo')
    expect(resolveTenant('localhost', undefined, 'Bad Slug!')).toBeNull()
  })
})
