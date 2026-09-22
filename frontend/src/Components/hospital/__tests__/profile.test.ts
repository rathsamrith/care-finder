import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'

import i18n from '@/i18n'

import CoverUploader from '../cover-uploader.vue'
import ProfileOverview from '../profile-overview.vue'

const post = vi.fn()
vi.mock('@/plugins/axios', () => ({ default: { post: (...a: unknown[]) => post(...a) } }))
const toast = { success: vi.fn(), error: vi.fn() }
vi.mock('vue-sonner', () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }))

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<i/>' } }] })
const full = {
  id: 4, name: 'Sunrise General', category: { id: 1, name: 'General' }, cover_image: 'http://x/c.jpg', phone_number: '012 345 678',
  open_time: '00:00', close_time: '00:00', province: 'Phnom Penh', village: 'Village 1', mission: 'Care first', vision: 'Healthy Cambodia', department: [{ id: 1 }]
}
const overview = (hospital: object, serviceCount = 1) => mount(ProfileOverview, { props: { hospital, serviceCount }, global: { plugins: [i18n, router] } })

beforeEach(() => { post.mockReset(); toast.success.mockReset(); toast.error.mockReset() })

describe('profile overview', () => {
  it('shows name, category, open badge, hours range, tel link and address', () => {
    const w = overview(full)
    expect(w.find('[data-testid="name"]').text()).toBe('Sunrise General')
    expect(w.text()).toContain('General')
    expect(w.text()).toContain('Open now') // 00:00-00:00 = 24h
    expect(w.find('[data-testid="hours"]').text()).toBe('00:00 – 00:00')
    expect(w.find('[data-testid="phone"]').attributes('href')).toBe('tel:012 345 678')
    expect(w.find('[data-testid="address"]').text()).toBe('Village 1, Phnom Penh')
    expect(w.find('[data-testid="completeness"]').exists()).toBe(false)
  })

  it('lists what is missing with a percent, and routes each fix', async () => {
    const w = overview({ id: 4, name: 'X', cover_image: 'No Cover', department: [] }, 0)
    expect(w.find('[data-testid="percent"]').text()).toBe('0%')
    const fixes = w.findAll('[data-testid="completeness"] li button')
    expect(fixes).toHaveLength(7)
    const byText = (s: string) => fixes.find((b) => b.text() === s)!
    await byText('Add phone').trigger('click')
    expect(w.emitted('edit')).toBeTruthy()
    const before = w.emitted('action')?.length ?? 0
    await fixes.filter((b) => b.text() === 'Add').at(-2)!.trigger('click') // departments
    expect(w.emitted('action')!.length).toBe(before + 1)
    expect(w.emitted('action')!.at(-1)).toEqual(['departments'])
    expect(w.find('[data-testid="open-badge"]').exists()).toBe(false)
  })

  it('shows prompts instead of stock images when mission and vision are empty', () => {
    const w = overview({ ...full, mission: '', vision: null })
    expect(w.find('[data-testid="mission"]').text()).toContain('has not added a mission')
    expect(w.find('img').exists()).toBe(false)
  })
})

describe('cover uploader', () => {
  const mountIt = (cover?: string) => mount(CoverUploader, { props: { hospitalId: 4, cover }, global: { plugins: [i18n] } })
  const pick = async (w: ReturnType<typeof mountIt>, file: File) => {
    const input = w.find('[data-testid="cover-input"]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await flushPromises()
  }

  it('shows an empty state without a cover and a change button with one', () => {
    expect(mountIt('No Cover').find('[data-testid="cover-empty"]').exists()).toBe(true)
    const w = mountIt('http://x/c.jpg')
    expect(w.find('[data-testid="cover-empty"]').exists()).toBe(false)
    expect(w.find('img').attributes('src')).toBe('http://x/c.jpg')
  })

  it('uploads a valid image and reports it', async () => {
    post.mockResolvedValue({ data: {} })
    const w = mountIt()
    await pick(w, new File(['x'], 'a.png', { type: 'image/png' }))
    expect(post).toHaveBeenCalledWith('/hospitals/4/uploadCover', expect.any(FormData))
    expect(toast.success).toHaveBeenCalled()
    expect(w.emitted('uploaded')).toHaveLength(1)
  })

  it('rejects the wrong type and oversized files without calling the API', async () => {
    const w = mountIt()
    await pick(w, new File(['x'], 'a.pdf', { type: 'application/pdf' }))
    const big = new File(['x'], 'b.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })
    await pick(w, big)
    expect(post).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledTimes(2)
  })

  it('shows the server reason when the upload fails and does not emit', async () => {
    post.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 403, data: { message: 'Not your hospital' } } }))
    const w = mountIt()
    await pick(w, new File(['x'], 'a.png', { type: 'image/png' }))
    expect(toast.error).toHaveBeenCalledWith('Not your hospital')
    expect(w.emitted('uploaded')).toBeUndefined()
  })
})
