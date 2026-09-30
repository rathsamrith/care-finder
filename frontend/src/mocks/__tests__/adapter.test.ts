import axios, { AxiosError } from 'axios'
import { beforeEach, describe, expect, it } from 'vitest'

import { resolveAppMode } from '@/config/app-mode'

import { mockAdapter, resetMockState } from '../adapter'

const api = axios.create({ baseURL: 'http://unused.invalid/v1', adapter: mockAdapter })

describe('resolveAppMode', () => {
  it('only the exact string "preview" enables mocks', () => {
    expect(resolveAppMode('preview')).toBe('preview')
    expect(resolveAppMode('prod')).toBe('prod')
    expect(resolveAppMode(undefined)).toBe('prod')
    expect(resolveAppMode('Preview')).toBe('prod')
    expect(resolveAppMode('true')).toBe('prod')
  })
})

describe('mock adapter', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMockState()
  })

  it('serves list and detail endpoints in the real API shape', async () => {
    const list = await api.get('/hospitals/list')
    expect(list.data.length).toBeGreaterThan(0)
    expect(list.data[0]).toMatchObject({ id: 1, cover_image: 'No Cover' })

    const detail = await api.get('/hospitals/show/2')
    expect(detail.data.id).toBe(2)
    expect(Array.isArray(detail.data.department)).toBe(true)
  })

  it('most-rated returns { hospital, total_star } rows the home page can render', async () => {
    const { data } = await api.get('/rates/most-rated')
    expect(data.length).toBeGreaterThan(0)
    for (const row of data) {
      expect(row.hospital).toMatchObject({ id: expect.any(Number), name: expect.any(String) })
      expect(typeof row.total_star).toBe('number')
    }
  })

  it('/me is 401 for guests and a role user after login', async () => {
    await expect(api.get('/me')).rejects.toMatchObject({ response: { status: 401 } })
    const { data } = await api.post('/login', { email: 'a@b.c', password: 'x' })
    localStorage.setItem('access_token', data.accessToken)
    const me = await api.get('/me')
    expect(me.data.roles).toEqual(['hospital'])
  })

  it('hospital /me lists its hospitals and the active one follows X-Hospital-Id', async () => {
    const { data: token } = await api.post('/login', {})
    localStorage.setItem('access_token', token.accessToken)

    const first = (await api.get('/me')).data
    expect(first.hospitals.length).toBeGreaterThan(1)
    expect(first.hospital.id).toBe(first.hospitals[0].id)

    const second = first.hospitals[1].id
    const chosen = (await api.get('/me', { headers: { 'X-Hospital-Id': String(second) } })).data
    expect(chosen.hospital.id).toBe(second)

    // an id that is not in the account's list is ignored, like the real API
    const stranger = (await api.get('/me', { headers: { 'X-Hospital-Id': '3' } })).data
    expect(stranger.hospital.id).toBe(first.hospitals[0].id)
  })

  it('site editor changes are visible on the public site until published=false', async () => {
    const before = await api.get('/sites/demo-hospital')
    expect(before.data.site.template).toBe('classic')

    await api.put('/hospitals/1/site', { template: 'bold', published: true })
    expect((await api.get('/sites/demo-hospital')).data.site.template).toBe('bold')

    await api.put('/hospitals/1/site', { published: false })
    const err = (await api.get('/sites/demo-hospital').catch((e) => e)) as AxiosError
    expect(err.response?.status).toBe(404)
  })

  it('validates slugs like the backend', async () => {
    expect((await api.get('/sites/slug-available', { params: { slug: 'admin' } })).data.available).toBe(false)
    expect((await api.get('/sites/slug-available', { params: { slug: 'a--b' } })).data.available).toBe(false)
    expect((await api.get('/sites/slug-available', { params: { slug: 'my-clinic' } })).data.available).toBe(true)
    const err = (await api.put('/hospitals/1/site', { slug: 'www' }).catch((e) => e)) as AxiosError
    expect(err.response?.status).toBe(400)
  })

  it('serves the check-in demo: queue, arrive, complete, phone check-in, kiosks', async () => {
    const q = (await api.get('/appointments/queue')).data
    expect(q.items[0]).toMatchObject({ status: 'Arrived', queue_label: 'B-1' })
    expect(q.counts).toEqual({ waiting: 1, expected: 2, completed: 0, missing: 0 })

    const arrived = (await api.post('/appointments/102/arrive')).data
    expect(arrived.queueLabel).toMatch(/^R-\d+$/)
    expect((await api.get('/appointments/queue')).data.counts.waiting).toBe(2)
    await api.put('/appointments/102/complete')
    expect((await api.get('/appointments/queue')).data.counts).toMatchObject({ waiting: 1, completed: 1 })

    const code = (await api.get('/appointments/7/check-in-code')).data
    expect(code.code).toBe('7-DEMO-CODE')
    const phone = await api.post('/appointments/7/check-in', { latitude: 11.5, longitude: 104.9 })
    expect(phone.data.queueLabel).toMatch(/^P-/)
    await expect(api.post('/appointments/7/check-in', {})).rejects.toMatchObject({ response: { status: 400 } })
  })

  it('kiosk endpoints need a device key, list/create/revoke kiosks, and refuse a bad code', async () => {
    const key = `kk_${'ab'.repeat(32)}`
    await expect(api.get('/kiosk/me')).rejects.toMatchObject({ response: { status: 401 } })
    expect((await api.get('/kiosk/me', { headers: { 'X-Kiosk-Key': key } })).data.hospital.name).toBeTruthy()
    expect((await api.post('/kiosk/check-in', { code: '3-ABCD-EFGH' }, { headers: { 'X-Kiosk-Key': key } })).data.queueLabel).toMatch(/^A-/)
    await expect(api.post('/kiosk/check-in', { code: 'BAD' }, { headers: { 'X-Kiosk-Key': key } })).rejects.toMatchObject({ response: { status: 400 } })

    const created = (await api.post('/hospitals/1/kiosks', { name: 'Building B', prefix: 'b' })).data
    expect(created.prefix).toBe('B')
    expect(created.key).toMatch(/^kk_[a-f0-9]{64}$/)
    expect((await api.get('/hospitals/1/kiosks')).data).toHaveLength(2)
    expect(JSON.stringify((await api.get('/hospitals/1/kiosks')).data)).not.toContain('kk_') // the list never carries keys
    await api.delete(`/hospitals/1/kiosks/${created.id}`)
    expect((await api.get('/hospitals/1/kiosks')).data).toHaveLength(1)
  })

  it('unmapped reads return [] and unmapped writes are accepted as no-ops', async () => {
    expect((await api.get('/something/unknown')).data).toEqual([])
    expect((await api.post('/something/unknown', {})).data.message).toMatch(/not saved/i)
  })
})
