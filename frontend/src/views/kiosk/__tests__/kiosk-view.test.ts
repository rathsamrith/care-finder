import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'

import KioskView from '../kiosk-view.vue'

const get = vi.fn()
const post = vi.fn()
vi.mock('@/plugins/axios', () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }))

// The camera itself can't run in a test: capture the callback the page gives the scanner.
let onCode: (code: string) => void = () => undefined
const scanner = { start: vi.fn(), stop: vi.fn() }
vi.mock('@/composables/use-qr-scanner', async () => {
  const { ref } = await import('vue')
  return {
    useQrScanner: (_video: unknown, cb: (c: string) => void) => {
      onCode = cb
      return { ...scanner, active: ref(false), failure: ref(null) }
    }
  }
})

const KEY = `kk_${'ab'.repeat(32)}`
const kioskInfo = { name: 'Main entrance', prefix: 'B', hospital: { id: 1, name: 'Sunrise General' } }
const ticket = { queueLabel: 'B-14', patientFirstName: 'Sokha', doctor: 'Dr Dara', room: 'Room 204', appointmentTime: '10:00', peopleAhead: 2, estimatedWaitMinutes: 40 }

const wrappers: ReturnType<typeof mount>[] = []
async function mountKiosk(storedKey: string | null = KEY) {
  if (storedKey) localStorage.setItem('kiosk_key', storedKey)
  const w = mount(KioskView, { attachTo: document.body, global: { plugins: [i18n] } })
  wrappers.push(w)
  await flushPromises()
  return w
}
const tick = async (ms: number) => {
  await vi.advanceTimersByTimeAsync(ms)
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }) // only the page's countdown
  get.mockReset()
  post.mockReset()
  scanner.start.mockReset()
  scanner.stop.mockReset()
  localStorage.clear()
  get.mockResolvedValue({ data: kioskInfo })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('pairing', () => {
  it('asks for the device key when the tablet was never paired', async () => {
    const w = await mountKiosk(null)
    expect(w.text()).toContain('Set up this kiosk')
    expect(get).not.toHaveBeenCalled()
    expect(scanner.start).not.toHaveBeenCalled()
  })

  it('pairs with a valid key: sends it in the header, remembers it, and starts scanning', async () => {
    const w = await mountKiosk(null)
    await w.find('#kiosk-key').setValue(`  ${KEY} `)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/kiosk/me', { headers: { 'X-Kiosk-Key': KEY } })
    expect(localStorage.getItem('kiosk_key')).toBe(KEY)
    expect(w.text()).toContain('Sunrise General')
    expect(w.text()).toContain('Main entrance (B)')
    expect(scanner.start).toHaveBeenCalled()
  })

  it('refuses a wrong key and stores nothing', async () => {
    get.mockRejectedValue({ response: { status: 401 } })
    const w = await mountKiosk(null)
    await w.find('#kiosk-key').setValue('nope')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('That key is not valid')
    expect(localStorage.getItem('kiosk_key')).toBeNull()
  })

  it('a remembered key is used on start; a revoked one sends the tablet back to pairing', async () => {
    const w = await mountKiosk()
    expect(get).toHaveBeenCalledWith('/kiosk/me', { headers: { 'X-Kiosk-Key': KEY } })
    expect(w.text()).toContain('Scan your QR code')

    get.mockRejectedValue({ response: { status: 401 } })
    const revoked = await mountKiosk()
    expect(revoked.text()).toContain('Set up this kiosk')
    expect(localStorage.getItem('kiosk_key')).toBeNull()
  })

  it('keeps the key and warns when the server is simply unreachable', async () => {
    get.mockRejectedValue(new Error('Network Error'))
    const w = await mountKiosk()
    expect(localStorage.getItem('kiosk_key')).toBe(KEY)
    expect(w.text()).toContain('Cannot reach the server')
  })

  it('can be unpaired on purpose', async () => {
    const w = await mountKiosk()
    await w.findAll('button').find((b) => b.text() === 'Unpair this kiosk')!.trigger('click')
    expect(localStorage.getItem('kiosk_key')).toBeNull()
    expect(w.text()).toContain('Set up this kiosk')
  })
})

describe('checking a patient in', () => {
  it('a scanned code checks in, shows the big ticket, and clears it after 15 seconds', async () => {
    post.mockResolvedValue({ data: ticket })
    const w = await mountKiosk()
    onCode('3-DYVX-3K3G')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/kiosk/check-in', { code: '3-DYVX-3K3G' }, { headers: { 'X-Kiosk-Key': KEY } })
    expect(w.find('[data-testid="queue-label"]').text()).toBe('B-14')
    expect(w.text()).toContain("You're checked in, Sokha")
    expect(w.text()).toContain('Next patient in 15s')

    await tick(5000)
    expect(w.text()).toContain('Next patient in 10s')
    await tick(10_000)
    expect(w.find('[data-testid="ticket"]').exists()).toBe(false) // gone: the screen is public
    expect(w.text()).toContain('Scan your QR code')
  })

  it('ignores further scans while a ticket is showing (no double check-in)', async () => {
    post.mockResolvedValue({ data: ticket })
    await mountKiosk()
    onCode('A-CODE-1234')
    await flushPromises()
    onCode('OTHER-CODE-1')
    await flushPromises()
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('a typed code works the same, and the button needs something typed', async () => {
    post.mockResolvedValue({ data: ticket })
    const w = await mountKiosk()
    const submit = w.find('form button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    await w.find('#kiosk-code').setValue(' 3-dyvx-3k3g ')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(post.mock.calls[0][1]).toEqual({ code: '3-dyvx-3k3g' })
    expect(w.find('[data-testid="queue-label"]').exists()).toBe(true)
  })

  it('shows why it failed, then clears the message after a few seconds', async () => {
    post.mockRejectedValue({ response: { status: 400, data: { message: 'This appointment has not been confirmed by the hospital yet.' } } })
    const w = await mountKiosk()
    onCode('3-DYVX-3K3G')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('has not been confirmed')
    await tick(7000)
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })

  it('the ticket shows the first name only', async () => {
    post.mockResolvedValue({ data: ticket })
    const w = await mountKiosk()
    onCode('3-DYVX-3K3G')
    await flushPromises()
    expect(w.find('[data-testid="ticket"]').text()).toContain('Sokha')
    expect(w.find('[data-testid="ticket"]').text()).toContain('Room 204')
  })

  it('a key revoked while running sends the tablet back to pairing', async () => {
    post.mockRejectedValue({ response: { status: 401 } })
    const w = await mountKiosk()
    onCode('3-DYVX-3K3G')
    await flushPromises()
    expect(w.text()).toContain('Set up this kiosk')
    expect(localStorage.getItem('kiosk_key')).toBeNull()
  })
})
