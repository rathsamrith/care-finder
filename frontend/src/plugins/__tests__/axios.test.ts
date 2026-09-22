import { beforeEach, describe, expect, it } from 'vitest'

import { clearActiveHospitalId, getActiveHospitalId, setActiveHospitalId } from '@/lib/active-hospital'

import axiosInstance from '../axios'

// Capture what the interceptors produce instead of hitting the network.
const seen: Record<string, unknown>[] = []
axiosInstance.defaults.adapter = async (config) => {
  seen.push({ ...(config.headers as any).toJSON() })
  return { data: {}, status: 200, statusText: 'OK', headers: {}, config } as any
}

describe('request headers', () => {
  beforeEach(() => {
    localStorage.clear()
    seen.length = 0
  })

  it('sends X-Hospital-Id only when a hospital has been selected', async () => {
    await axiosInstance.get('/me')
    expect(seen[0]['X-Hospital-Id']).toBeUndefined()

    setActiveHospitalId(7)
    await axiosInstance.get('/me')
    expect(seen[1]['X-Hospital-Id']).toBe('7')

    clearActiveHospitalId()
    await axiosInstance.get('/me')
    expect(seen[2]['X-Hospital-Id']).toBeUndefined()
  })

  it('still sends the bearer token', async () => {
    localStorage.setItem('access_token', 'abc')
    await axiosInstance.get('/me')
    expect(seen[0].Authorization).toBe('Bearer abc')
  })

  it('active-hospital helpers round-trip as strings', () => {
    expect(getActiveHospitalId()).toBeNull()
    setActiveHospitalId(42)
    expect(getActiveHospitalId()).toBe('42')
  })
})
