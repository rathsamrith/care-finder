import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'

import NoHospitalSet from '../no-hospital-set.vue'

const post = vi.fn()
vi.mock('@/plugins/axios', () => ({ default: { get: vi.fn().mockResolvedValue({ data: [] }), post: (...a: unknown[]) => post(...a) } }))

const assign = vi.fn()
const mountForm = () => mount(NoHospitalSet, { global: { plugins: [i18n] } })
const fill = (w: any, over: Record<string, string> = {}) => {
  Object.assign(w.vm.submissionFrom, {
    name: ' Sunrise Clinic ',
    category_id: '2',
    street_address: '12 Main St',
    province: 'Phnom Penh',
    latitude: '11.55',
    longitude: '104.92',
    open_time: '08:00',
    close_time: '17:00',
    ...over
  })
}

describe('create hospital form', () => {
  beforeEach(() => {
    post.mockReset()
    localStorage.clear()
    vi.stubGlobal('location', { ...window.location, assign })
    assign.mockReset()
  })

  it("posts to POST /hospitals with the API's field names", async () => {
    post.mockResolvedValue({ data: { id: 42 } })
    const w = mountForm()
    fill(w)
    await (w.vm as any).submitForm()
    expect(post).toHaveBeenCalledWith('/hospitals', {
      name: 'Sunrise Clinic',
      categoryId: 2,
      streetAddress: '12 Main St',
      village: undefined,
      commune: undefined,
      district: undefined,
      province: 'Phnom Penh',
      latitude: '11.55',
      longitude: '104.92',
      openTime: '08:00',
      closeTime: '17:00'
    })
  })

  it('never sends the old snake_case fields, and leaves empty optionals out', async () => {
    post.mockResolvedValue({ data: { id: 42 } })
    const w = mountForm()
    fill(w, { open_time: '', close_time: '', street_address: '', latitude: '', longitude: '' })
    await (w.vm as any).submitForm()
    const body = post.mock.calls[0][1]
    for (const stale of ['category_id', 'street_address', 'open_time', 'close_time']) expect(Object.keys(body)).not.toContain(stale)
    expect(body.openTime).toBeUndefined()
    expect(body.closeTime).toBeUndefined()
    expect(body.streetAddress).toBeUndefined()
  })

  it('selects the new hospital and opens its page', async () => {
    post.mockResolvedValue({ data: { id: 42 } })
    const w = mountForm()
    fill(w)
    await (w.vm as any).submitForm()
    expect(localStorage.getItem('active_hospital_id')).toBe('42')
    expect(assign).toHaveBeenCalledWith('/myHospital')
  })

  it('needs a name and a category before calling the API', async () => {
    const w = mountForm()
    fill(w, { name: '  ' })
    await (w.vm as any).submitForm()
    fill(w, { category_id: '' })
    await (w.vm as any).submitForm()
    expect(post).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })

  it('stays put (input kept) when the server refuses', async () => {
    post.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 409, data: { message: 'An organization can have at most 5 hospitals' } } }))
    const w = mountForm()
    fill(w)
    await (w.vm as any).submitForm()
    await flushPromises()
    expect(assign).not.toHaveBeenCalled()
    expect((w.vm as any).submissionFrom.name).toBe(' Sunrise Clinic ')
  })

  it('uses the commune centre as latitude AND longitude (longitude used to be set from latitude)', () => {
    const w = mountForm()
    ;(w.vm as any).setLatLng({ geodata: { lat: '13.51', long: '103.02' } })
    expect((w.vm as any).submissionFrom.latitude).toBe('13.51')
    expect((w.vm as any).submissionFrom.longitude).toBe('103.02')
  })
})
