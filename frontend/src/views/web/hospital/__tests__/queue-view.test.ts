import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'

import QueueView from '../queue-view.vue'

const get = vi.fn()
const post = vi.fn()
const put = vi.fn()
const socketOn = vi.fn()
const socketOff = vi.fn()
vi.mock('@/plugins/axios', () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), put: (...a: unknown[]) => put(...a) } }))
vi.mock('@/plugins/socket', () => ({ socketConstance: { on: (...a: unknown[]) => socketOn(...a), off: (...a: unknown[]) => socketOff(...a), connect: vi.fn(), disconnect: vi.fn() } }))

// The dashboard layout also fetches its own data; count only calls to what is under test.
const callsTo = (url: string) => get.mock.calls.filter((c) => c[0] === url).length

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })

const item = (id: number, status: string, over: object = {}) => ({
  id, status, title: 'Checkup', queue_label: null, appointment_time: '1970-01-01T10:00:00.000Z',
  room: { name: 'Room 204' }, doctor: { first_name: 'Dara', last_name: 'Vann' }, user: { first_name: 'Sokha', last_name: 'Chan' }, ...over,
})
const queue = {
  date: '2026-10-05',
  counts: { waiting: 1, expected: 1, completed: 1, missing: 1 },
  items: [item(1, 'Arrived', { queue_label: 'B-1' }), item(2, 'Confirmed'), item(3, 'Completed', { queue_label: 'A-1' }), item(4, 'Missing')],
}

const wrappers: ReturnType<typeof mount>[] = []
async function render(roles: string[]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.user = { id: 1 }
  auth.roles = roles
  const w = mount(QueueView, { global: { plugins: [pinia, i18n, router] } })
  wrappers.push(w)
  await flushPromises()
  return w
}
const rowOf = (w: ReturnType<typeof mount>, id: string) => w.find(`tr[data-status="${id}"]`)
const buttonsIn = (row: { findAll: (s: string) => { map: (f: (b: any) => string) => string[] } }) => row.findAll('button').map((b) => b.text())

beforeEach(() => {
  get.mockReset().mockResolvedValue({ data: queue })
  post.mockReset().mockResolvedValue({ data: {} })
  put.mockReset().mockResolvedValue({ data: {} })
  socketOn.mockReset()
  socketOff.mockReset()
})
afterEach(() => wrappers.splice(0).forEach((w) => w.unmount()))

describe('the queue page', () => {
  it("lists today's people in the order the server sent, with the counters", async () => {
    const w = await render(['hospital'])
    expect(get).toHaveBeenCalledWith('/appointments/queue')
    expect(w.findAll('tbody tr').map((r) => r.find('td').text())).toEqual(['B-1', '—', 'A-1', '—'])
    expect(w.find('[data-testid="stat-waiting"]').text()).toBe('1')
    expect(w.find('[data-testid="stat-completed"]').text()).toBe('1')
    expect(w.text()).toContain('Sokha Chan')
    expect(w.text()).toContain('10:00')
    expect(w.text()).toContain('Room 204')
  })

  it('reception: check in confirmed and missed patients, complete the waiting one, nothing for completed', async () => {
    const w = await render(['hospital'])
    expect(buttonsIn(rowOf(w, 'Arrived'))).toEqual(['Complete'])
    expect(buttonsIn(rowOf(w, 'Confirmed'))).toEqual(['Check in'])
    expect(buttonsIn(rowOf(w, 'Missing'))).toEqual(['Check in']) // a late arrival
    expect(buttonsIn(rowOf(w, 'Completed'))).toEqual([])
  })

  it('a doctor can only complete - checking people in is reception\'s job', async () => {
    const w = await render(['doctor'])
    expect(buttonsIn(rowOf(w, 'Arrived'))).toEqual(['Complete'])
    expect(buttonsIn(rowOf(w, 'Confirmed'))).toEqual([])
    expect(buttonsIn(rowOf(w, 'Missing'))).toEqual([])
  })

  it('check in calls the arrive endpoint and reloads the list', async () => {
    const w = await render(['hospital'])
    await rowOf(w, 'Confirmed').find('button').trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/appointments/2/arrive')
    expect(callsTo('/appointments/queue')).toBe(2)
  })

  it('complete calls the complete endpoint', async () => {
    const w = await render(['hospital'])
    await rowOf(w, 'Arrived').find('button').trigger('click')
    await flushPromises()
    expect(put).toHaveBeenCalledWith('/appointments/1/complete')
  })

  it('shows the server\'s reason when an action is refused, and keeps the list', async () => {
    post.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 400, data: { message: "Only today's appointments can be checked in." } } }))
    const w = await render(['hospital'])
    await rowOf(w, 'Confirmed').find('button').trigger('click')
    await flushPromises()
    expect(w.findAll('tbody tr')).toHaveLength(4)
  })

  it('says so when there is nothing today', async () => {
    get.mockResolvedValue({ data: { ...queue, counts: { waiting: 0, expected: 0, completed: 0, missing: 0 }, items: [] } })
    const w = await render(['hospital'])
    expect(w.text()).toContain('No appointments to work through today.')
  })

  it('refreshes when a check-in event arrives, and stops listening when left', async () => {
    const w = await render(['hospital'])
    const events = socketOn.mock.calls.map((c) => c[0])
    expect(events).toEqual(expect.arrayContaining(['notify', 'appointment-status-changed']))
    // the layout registers its own listener too; the page's is registered last
    const refresh = [...socketOn.mock.calls].reverse().find((c) => c[0] === 'notify')![1] as () => void
    refresh()
    await flushPromises()
    expect(callsTo('/appointments/queue')).toBe(2)
    w.unmount()
    expect(socketOff).toHaveBeenCalledWith('notify', refresh)
  })
})
