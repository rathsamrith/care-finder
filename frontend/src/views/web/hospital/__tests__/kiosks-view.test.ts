import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'

import KiosksView from '../kiosks-view.vue'

const get = vi.fn()
const post = vi.fn()
const del = vi.fn()
vi.mock('@/plugins/axios', () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), delete: (...a: unknown[]) => del(...a) } }))
vi.mock('@/plugins/socket', () => ({ socketConstance: { on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn() } }))

const callsTo = (url: string) => get.mock.calls.filter((c) => c[0] === url).length

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })
const KEY = `kk_${'cd'.repeat(32)}`

const wrappers: ReturnType<typeof mount>[] = []
async function render(hospital: object | null = { id: 9 }) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.user = { id: 1 }
  auth.roles = ['hospital']
  auth.hospital = hospital ?? undefined
  const w = mount(KiosksView, { global: { plugins: [pinia, i18n, router] } })
  wrappers.push(w)
  await flushPromises()
  return w
}

beforeEach(() => {
  get.mockReset().mockResolvedValue({ data: [{ id: 1, name: 'Main entrance', prefix: 'A', lastSeenAt: null }] })
  post.mockReset()
  del.mockReset().mockResolvedValue({ data: {} })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

const fillAndSubmit = async (w: ReturnType<typeof mount>, name: string, prefix: string) => {
  await w.find('form input[maxlength="60"]').setValue(name)
  await w.find('form input[maxlength="3"]').setValue(prefix)
  await w.find('form').trigger('submit')
  await flushPromises()
}

describe('kiosks admin page', () => {
  it("lists this hospital's kiosks with their ticket letter", async () => {
    const w = await render()
    expect(get).toHaveBeenCalledWith('/hospitals/9/kiosks')
    expect(w.text()).toContain('Main entrance')
    expect(w.text()).toContain('A')
    expect(w.text()).toContain('Last seen: never')
  })

  it('creating a kiosk shows its device key once, with setup steps, until dismissed', async () => {
    post.mockResolvedValue({ data: { id: 2, name: 'Building B', prefix: 'B', key: KEY } })
    const w = await render()
    await fillAndSubmit(w, ' Building B ', 'b')
    expect(post).toHaveBeenCalledWith('/hospitals/9/kiosks', { name: 'Building B', prefix: 'B' })
    expect((w.find('[data-testid="device-key"]').element as HTMLInputElement).value).toBe(KEY)
    expect(w.text()).toContain('shown only once')
    expect(w.text()).toContain(`${window.location.origin}/kiosk`)

    await w.findAll('button').find((b) => b.text() === "I've saved it")!.trigger('click')
    expect(w.find('[data-testid="device-key"]').exists()).toBe(false)
    expect(w.html()).not.toContain(KEY) // gone from the page for good
  })

  it('the listing never contains a key', async () => {
    const w = await render()
    expect(w.html()).not.toContain('kk_')
  })

  it('needs a name and a 1-3 letter ticket letter before calling the API', async () => {
    const w = await render()
    await fillAndSubmit(w, '', 'A')
    await fillAndSubmit(w, 'Desk', '')
    await fillAndSubmit(w, 'Desk', 'ABCD')
    await fillAndSubmit(w, 'Desk', '12')
    expect(post).not.toHaveBeenCalled()
    expect(w.find('[role="alert"]').text()).toContain('Enter a name and a ticket letter')
  })

  it("shows the server's reason when creating fails (e.g. the 10-kiosk limit)", async () => {
    post.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 409, data: { message: 'A hospital can have at most 10 kiosks' } } }))
    const w = await render()
    await fillAndSubmit(w, 'Desk', 'D')
    expect(w.find('[role="alert"]').text()).toContain('at most 10 kiosks')
    expect(w.find('[data-testid="device-key"]').exists()).toBe(false)
  })

  it('removing a kiosk opens a confirmation dialog; cancel does nothing, confirm revokes and reloads', async () => {
    const w = await render()
    const open = async () => {
      await w.findAll('button').find((b) => b.text() === 'Remove')!.trigger('click')
      await flushPromises()
    }
    const dlg = () => document.body.querySelector('[data-testid="confirm-dialog"]')
    await open()
    expect(dlg()?.textContent).toContain('Remove this kiosk?')
    expect(del).not.toHaveBeenCalled()
    ;[...dlg()!.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancel')!.click()
    await flushPromises()
    expect(del).not.toHaveBeenCalled()

    await open()
    ;(document.body.querySelector('[data-testid="confirm-yes"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(del).toHaveBeenCalledWith('/hospitals/9/kiosks/1')
    expect(callsTo('/hospitals/9/kiosks')).toBe(2)
    expect(window.confirm).not.toHaveBeenCalled()
  })

  it('without a hospital there is nothing to manage', async () => {
    const w = await render(null)
    expect(get.mock.calls.filter((c) => String(c[0]).includes('/kiosks'))).toHaveLength(0)
    expect(w.find('form').exists()).toBe(false)
  })
})
