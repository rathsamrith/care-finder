import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'

import TeamView from '../team-view.vue'

type Role = 'Owner' | 'Admin' | 'Manager'
const get = vi.fn()
const post = vi.fn()
vi.mock('@/plugins/axios', () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), put: vi.fn(), delete: vi.fn() }
}))
vi.mock('@/plugins/socket', () => ({ socketConstance: { on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn() } }))

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })

const team = (myRole: Role) => ({
  id: 1,
  name: 'Sunrise Group',
  myRole,
  hospitals: [{ id: 10, name: 'Sunrise General' }],
  members: [
    { userId: 1, name: 'Olivia Owner', email: 'o@x.com', role: 'Owner' },
    { userId: 2, name: 'Adam Admin', email: 'a@x.com', role: 'Admin' },
    { userId: 3, name: 'Mia Manager', email: 'm@x.com', role: 'Manager' }
  ],
  invites: myRole === 'Manager' ? [] : [{ id: 7, email: 'pending@x.com', role: 'Manager', expiresAt: '2099-01-01' }]
})

async function render(myRole: Role, meId: number) {
  get.mockResolvedValue({ data: team(myRole) })
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.user = { id: meId, first_name: 'Me' }
  auth.roles = ['hospital']
  const w = mount(TeamView, { global: { plugins: [pinia, i18n, router] } })
  await flushPromises()
  return w
}

describe('team page controls follow the viewer role', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('Owner: invite form (incl. Admin role), role selects for everyone, can remove others', async () => {
    const w = await render('Owner', 1)
    expect(w.find('form').exists()).toBe(true)
    expect(w.findAll('form option').map((o) => o.attributes('value'))).toEqual(['Manager', 'Admin'])
    expect(w.findAll('tbody select')).toHaveLength(3)
    expect(w.text()).toContain('pending@x.com')
    const buttons = w.findAll('tbody button').map((b) => b.text())
    expect(buttons.filter((t) => t === 'Remove')).toHaveLength(2)
    expect(buttons).toContain('Leave') // own row
  })

  it('Admin: can invite only Managers, no role selects, can remove Managers but not the Owner/other Admins', async () => {
    const w = await render('Admin', 2)
    expect(w.findAll('form option').map((o) => o.attributes('value'))).toEqual(['Manager'])
    expect(w.findAll('tbody select')).toHaveLength(0)
    const rows = w.findAll('tbody tr')
    const buttonsOf = (name: string) => rows.find((r) => r.text().includes(name))!.findAll('button').map((b) => b.text())
    expect(buttonsOf('Olivia')).toEqual([])
    expect(buttonsOf('Adam')).toEqual(['Leave'])
    expect(buttonsOf('Mia')).toEqual(['Remove'])
  })

  it('Manager: read-only list, no invite form or pending invitations, can only leave', async () => {
    const w = await render('Manager', 3)
    expect(w.find('form').exists()).toBe(false)
    expect(w.text()).not.toContain('Pending invitations')
    expect(w.findAll('tbody select')).toHaveLength(0)
    expect(w.findAll('tbody button').map((b) => b.text())).toEqual(['Leave'])
  })

  it('shows the shareable link when the server could not send the email', async () => {
    const w = await render('Owner', 1)
    post.mockResolvedValue({ data: { email: 'new@x.com', emailSent: false, acceptUrl: 'https://app.test/accept-invite?t=abc' } })
    await w.find('input[type="email"]').setValue('new@x.com')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/organizations/1/invites', { email: 'new@x.com', role: 'Manager' })
    expect((w.find('input[readonly]').element as HTMLInputElement).value).toBe('https://app.test/accept-invite?t=abc')
  })
})
