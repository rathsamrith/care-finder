import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDoctorStore } from '../doctor-store'

const put = vi.fn()
const post = vi.fn()
vi.mock('@/plugins/axios', () => ({ default: { put: (...a: unknown[]) => put(...a), post: (...a: unknown[]) => post(...a), get: vi.fn() } }))

describe('doctor store reports failures to the caller', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    put.mockReset()
    post.mockReset()
  })

  it('createDoctor and updateDoctor rethrow, so the form can show the server message', async () => {
    const store = useDoctorStore()
    post.mockRejectedValue(new Error('Email is already registered'))
    put.mockRejectedValue(new Error('nope'))
    await expect(store.createDoctor({ firstName: 'A', lastName: 'B', email: 'a@b.c', password: 'longenough1', hospitalId: 1 })).rejects.toThrow('already registered')
    await expect(store.updateDoctor(1, { firstName: 'A' })).rejects.toThrow('nope')
  })

  it('returns the data on success', async () => {
    put.mockResolvedValue({ data: { id: 1 } })
    expect(await useDoctorStore().updateDoctor(1, { firstName: 'A' })).toEqual({ id: 1 })
  })
})
