import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import i18n, { setLocale } from '@/i18n'

import LoginView from '../login-view.vue'

const post = vi.fn()
const get = vi.fn()
vi.mock('@/plugins/axios', () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }))
vi.mock('@/plugins/socket', () => ({ socketConstant: {}, socketConstance: { on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn() } }))

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })
type W = ReturnType<typeof mount>
const mounted: W[] = []

// vee-validate debounces validation by a few ms, so wait for timers as well as promises.
const settle = async () => {
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 20))
  await flushPromises()
}

async function open(mode: 'signin' | 'signup') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(LoginView, { attachTo: document.body, global: { plugins: [pinia, i18n, router] } })
  mounted.push(w)
  if (mode === 'signup') {
    await w.findAll('button').find((b) => b.text() === 'Create an account')!.trigger('click')
  }
  return w
}
const el = (w: W, id: string) => w.find(`#${id}`)
const set = async (w: W, id: string, value: string) => el(w, id).setValue(value)
const blur = async (w: W, id: string) => {
  await el(w, id).trigger('blur')
  await settle()
}
const submit = async (w: W) => {
  await w.find('form').trigger('submit')
  await settle()
}
const errorOf = (w: W, id: string) => w.find(`#${id}-error`).text()
const hasError = (w: W, id: string) => w.find(`#${id}-error`).exists()

beforeEach(() => {
  post.mockReset()
  get.mockReset()
  localStorage.clear()
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
})

describe('sign-in form validation', () => {
  it('an empty submit shows what is missing, calls nothing and focuses the first field', async () => {
    const w = await open('signin')
    await submit(w)
    expect(errorOf(w, 'login-email')).toBe('Enter your email.')
    expect(errorOf(w, 'login-password')).toBe('Enter your password.')
    expect(post).not.toHaveBeenCalled()
    expect(document.activeElement?.id).toBe('login-email')
  })

  it('is quiet while typing, checks when leaving the field, then re-checks live until fixed', async () => {
    const w = await open('signin')
    await set(w, 'login-email', 'not-an-email')
    await settle()
    expect(hasError(w, 'login-email')).toBe(false) // no nagging mid-typing

    await blur(w, 'login-email')
    expect(errorOf(w, 'login-email')).toBe('Enter a valid email address.')

    await set(w, 'login-email', 'dara@example.com')
    await settle()
    expect(hasError(w, 'login-email')).toBe(false) // cleared as soon as it is valid
  })

  it('links errors to their field for screen readers', async () => {
    const w = await open('signin')
    await submit(w)
    const email = el(w, 'login-email')
    expect(email.attributes('aria-invalid')).toBe('true')
    expect(email.attributes('aria-describedby')).toBe('login-email-error')
    expect(w.find('#login-email-error').attributes('role')).toBe('alert')
    await set(w, 'login-email', 'dara@example.com')
    await settle()
    expect(el(w, 'login-email').attributes('aria-invalid')).toBe('false')
  })

  it('sends trimmed credentials, and does not impose a minimum password length', async () => {
    post.mockResolvedValue({ data: { accessToken: 'tok' } })
    get.mockResolvedValue({ data: { roles: ['user'] } })
    const w = await open('signin')
    await set(w, 'login-email', '  dara@example.com ')
    await set(w, 'login-password', 'abc')
    await submit(w)
    expect(post).toHaveBeenCalledWith('/login', { email: 'dara@example.com', password: 'abc' })
    expect(localStorage.getItem('access_token')).toBe('tok')
  })

  it('shows a refused login inline and keeps the input', async () => {
    post.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 401, data: {} } }))
    const w = await open('signin')
    await set(w, 'login-email', 'dara@example.com')
    await set(w, 'login-password', 'wrongpass')
    await submit(w)
    expect(w.find('[role="alert"]').text()).toContain('Incorrect email or password.')
    expect((el(w, 'login-email').element as HTMLInputElement).value).toBe('dara@example.com')
    expect(localStorage.getItem('access_token')).toBeNull()

    await set(w, 'login-password', 'another') // typing again clears the stale message
    await settle()
    expect(w.text()).not.toContain('Incorrect email or password.')
  })

  it('says so when rate limited', async () => {
    post.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 429, data: { message: 'ThrottlerException' } } }))
    const w = await open('signin')
    await set(w, 'login-email', 'dara@example.com')
    await set(w, 'login-password', 'whatever1')
    await submit(w)
    expect(w.text()).toContain('Too many attempts')
  })

  it('disables the button and shows progress while the request is in flight (no double submit)', async () => {
    let finish: (v: unknown) => void = () => undefined
    post.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    get.mockResolvedValue({ data: { roles: ['user'] } })
    const w = await open('signin')
    await set(w, 'login-email', 'dara@example.com')
    await set(w, 'login-password', 'whatever1')
    await w.find('form').trigger('submit')
    await settle()
    const button = w.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Signing in…')
    await w.find('form').trigger('submit') // a second click while waiting
    await settle()
    expect(post).toHaveBeenCalledTimes(1)
    finish({ data: { accessToken: 't' } })
    await settle()
  })
})

describe('sign-up form validation', () => {
  const fillValid = async (w: W, over: Record<string, string> = {}) => {
    const v = { firstName: 'Dara', lastName: 'Sok', email: 'dara@example.com', phone: '', password: 'longenough1', confirmPassword: 'longenough1', role: 'user', ...over }
    for (const [key, value] of Object.entries(v)) await set(w, `signup-${key}`, value)
    await settle()
  }

  it('an empty submit lists every required field, leaves the optional phone alone, and focuses the first', async () => {
    const w = await open('signup')
    await submit(w)
    expect(errorOf(w, 'signup-firstName')).toBe('Enter your first name.')
    expect(errorOf(w, 'signup-lastName')).toBe('Enter your last name.')
    expect(errorOf(w, 'signup-email')).toBe('Enter your email.')
    expect(errorOf(w, 'signup-password')).toBe('Choose a password.')
    expect(errorOf(w, 'signup-confirmPassword')).toBe('Confirm your password.')
    expect(errorOf(w, 'signup-role')).toBe('Choose how you will use Care Finder.')
    expect(hasError(w, 'signup-phone')).toBe(false)
    expect(post).not.toHaveBeenCalled()
    expect(document.activeElement?.id).toBe('signup-firstName')
  })

  it('whitespace-only names do not count as filled in', async () => {
    const w = await open('signup')
    await fillValid(w, { firstName: '   ' })
    await submit(w)
    expect(errorOf(w, 'signup-firstName')).toBe('Enter your first name.')
    expect(post).not.toHaveBeenCalled()
  })

  it('phone is optional but must look like a phone number when given', async () => {
    const w = await open('signup')
    await set(w, 'signup-phone', 'abc')
    await blur(w, 'signup-phone')
    expect(errorOf(w, 'signup-phone')).toContain('valid phone number')
    await set(w, 'signup-phone', '+855 12 345 678')
    await settle()
    expect(hasError(w, 'signup-phone')).toBe(false)
    await set(w, 'signup-phone', '')
    await blur(w, 'signup-phone')
    expect(hasError(w, 'signup-phone')).toBe(false)
  })

  it('password: 8-72 characters, and the confirmation must match', async () => {
    const w = await open('signup')
    await set(w, 'signup-password', 'short')
    await blur(w, 'signup-password')
    expect(errorOf(w, 'signup-password')).toBe('Use at least 8 characters.')
    await set(w, 'signup-password', 'x'.repeat(73))
    await settle()
    expect(errorOf(w, 'signup-password')).toBe('Use at most 72 characters.')
    await set(w, 'signup-password', 'longenough1')
    await set(w, 'signup-confirmPassword', 'different123')
    await blur(w, 'signup-confirmPassword')
    expect(errorOf(w, 'signup-confirmPassword')).toBe('The two passwords do not match.')
    await set(w, 'signup-confirmPassword', 'longenough1')
    await settle()
    expect(hasError(w, 'signup-confirmPassword')).toBe(false)
    expect(hasError(w, 'signup-password')).toBe(false)
  })

  it("sends exactly the API's fields (trimmed, optional phone omitted) and signs in", async () => {
    post.mockResolvedValue({ data: { accessToken: 'tok' } })
    const w = await open('signup')
    await fillValid(w, { firstName: '  Dara ', email: ' dara@example.com ', role: 'hospital' })
    await submit(w)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][1]).toEqual({
      firstName: 'Dara',
      lastName: 'Sok',
      email: 'dara@example.com',
      phone: undefined,
      password: 'longenough1',
      role: 'hospital'
    })
    expect(localStorage.getItem('access_token')).toBe('tok')
  })

  it('sends the phone when given, and never the old Laravel-era fields', async () => {
    post.mockResolvedValue({ data: { accessToken: 'tok' } })
    const w = await open('signup')
    await fillValid(w, { phone: '012 345 678' })
    await submit(w)
    const body = post.mock.calls[0][1]
    expect(body.phone).toBe('012 345 678')
    for (const stale of ['first_name', 'last_name', 'name', 'user_type', 'password_confirmation', 'confirmPassword']) {
      expect(Object.keys(body)).not.toContain(stale)
    }
  })

  it('shows a server refusal inline and keeps what was typed', async () => {
    post.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 409, data: { message: 'Email is already registered' } } }))
    const w = await open('signup')
    await fillValid(w)
    await submit(w)
    expect(w.find('[role="alert"]').text()).toContain('Email is already registered')
    expect((el(w, 'signup-email').element as HTMLInputElement).value).toBe('dara@example.com')
    expect(localStorage.getItem('access_token')).toBeNull()
  })

  it('has no username field any more', async () => {
    const w = await open('signup')
    expect(w.find('form').text()).not.toContain('Username')
  })

  it('re-words existing messages when the language changes', async () => {
    const w = await open('signup')
    await submit(w)
    expect(errorOf(w, 'signup-firstName')).toBe('Enter your first name.')
    setLocale('km')
    await settle()
    expect(errorOf(w, 'signup-firstName')).toBe('សូមបញ្ចូលនាមខ្លួនរបស់អ្នក')
    setLocale('en')
    await settle()
  })
})
