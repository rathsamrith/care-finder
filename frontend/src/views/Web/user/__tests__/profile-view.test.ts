import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'

import ProfileView from '../profile-view.vue'

// The page calls these on mount for patients only.
const get = vi.fn().mockResolvedValue({ data: [] })
vi.mock('@/plugins/axios', () => ({ default: { get: (...a: unknown[]) => get(...a), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/plugins/socket', () => ({ socketConstance: { on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn() } }))

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })

async function render(roles: string[], user: Record<string, unknown> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.user = { first_name: 'Sunrise', last_name: 'Admin', email: 'a@b.test', profile: 'No profile', ...user }
  auth.roles = roles
  const wrapper = mount(ProfileView, { global: { plugins: [pinia, i18n, router] } })
  await flushPromises()
  return wrapper
}

describe('profile page by role', () => {
  beforeEach(() => get.mockClear())

  it('patient: tabs, address and visit history, public layout, loads own data', async () => {
    const w = await render(['user'])
    expect(w.text()).toContain('History')
    expect(w.text()).toContain('Address')
    expect(w.find('[data-sidebar]').exists()).toBe(false)
    expect(get).toHaveBeenCalledWith('/user-addresses')
    expect(get).toHaveBeenCalledWith('/appointments/list')
  })

  it.each([
    ['hospital', '/myHospital', 'Manage hospital'],
    ['doctor', '/doctor/dashboard', 'Open dashboard'],
    ['admin', '/admin/dashboard', 'Open dashboard']
  ])('%s: account card + workspace link, no history/address, no patient fetches', async (role, to, cta) => {
    const w = await render([role])
    expect(w.text()).not.toContain('History')
    expect(w.text()).not.toContain('Address')
    expect(w.text()).toContain('Account information')
    expect(w.text()).toContain(cta)
    expect(w.find(`a[href="${to}"]`).exists()).toBe(true)
    expect(get).not.toHaveBeenCalledWith('/user-addresses')
    expect(get).not.toHaveBeenCalledWith('/appointments/list')
  })

  it('shows "Not provided" for empty fields and initials when there is no photo', async () => {
    const w = await render(['hospital'])
    expect(w.text()).toContain('Not provided')
    expect(w.text()).toContain('SA')
    expect(w.html()).not.toContain('elemecdn.com')
  })
})
