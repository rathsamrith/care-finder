import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'

import AcceptInviteView from '../accept-invite-view.vue'

const post = vi.fn()
vi.mock('@/plugins/axios', () => ({ default: { get: vi.fn().mockResolvedValue({ data: [] }), post: (...a: unknown[]) => post(...a) } }))
vi.mock('@/plugins/socket', () => ({ socketConstance: { on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn() } }))

const TOKEN = 'a'.repeat(64)
const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/accept-invite', component: AcceptInviteView }, { path: '/:p(.*)*', component: { template: '<div />' } }] })

async function render(query: string, signedIn: boolean) {
  await router.push(`/accept-invite${query}`)
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().isAuthenticated = signedIn
  const w = mount(AcceptInviteView, { global: { plugins: [pinia, i18n, router] } })
  await flushPromises()
  return w
}

// The layout's header has its own buttons (language switcher), so find ours by label.
const acceptButton = (w: ReturnType<typeof mount>) => w.findAll('button').find((b) => b.text() === 'Accept invitation')

describe('accept invitation page', () => {
  beforeEach(() => post.mockReset())

  it('rejects a link without a valid token', async () => {
    const w = await render('?t=short&e=a@b.c', true)
    expect(w.text()).toContain('incomplete or invalid')
    expect(acceptButton(w)).toBeUndefined()
  })

  it('asks signed-out visitors to sign in first, and never calls the API', async () => {
    const w = await render(`?t=${TOKEN}&e=new@x.com`, false)
    expect(w.text()).toContain('new@x.com')
    expect(w.find('a[href="/login"]').exists()).toBe(true)
    expect(post).not.toHaveBeenCalled()
  })

  it('does not accept automatically on load - only on click', async () => {
    const w = await render(`?t=${TOKEN}&e=new@x.com`, true)
    expect(post).not.toHaveBeenCalled()
    post.mockRejectedValueOnce(
      Object.assign(new Error('Request failed'), {
        response: { data: { message: 'This invitation was sent to a different email address' } }
      })
    )
    await acceptButton(w)!.trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/organizations/invites/accept', { token: TOKEN })
    expect(w.find('[role="alert"]').text()).toContain('different email address')
  })
})
