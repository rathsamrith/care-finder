import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import i18n, { changeLocale, setLocale } from '../index'

describe('changeLocale', () => {
  beforeEach(() => {
    localStorage.clear()
    setLocale('en')
  })
  afterEach(() => {
    delete (document as any).startViewTransition
    vi.restoreAllMocks()
  })

  it('switches locale, <html lang> and the stored preference', async () => {
    await changeLocale('km')
    expect(i18n.global.locale.value).toBe('km')
    expect(document.documentElement.lang).toBe('km')
    expect(localStorage.getItem('cf_locale')).toBe('km')
  })

  it('does nothing when the locale is unchanged', async () => {
    const start = vi.fn()
    ;(document as any).startViewTransition = start
    await changeLocale('en')
    expect(start).not.toHaveBeenCalled()
  })

  it('applies the change inside a View Transition when the browser supports it', async () => {
    let applied = false
    ;(document as any).startViewTransition = (cb: () => Promise<void>) => ({
      updateCallbackDone: cb().then(() => {
        applied = true
      })
    })
    await changeLocale('km')
    expect(applied).toBe(true)
    expect(i18n.global.locale.value).toBe('km')
  })

  it('waits for the Khmer font but never longer than the timeout', async () => {
    vi.useFakeTimers()
    ;(document as any).fonts = { load: () => new Promise(() => {}) } // never resolves
    const done = changeLocale('km')
    await vi.advanceTimersByTimeAsync(1300)
    await done
    expect(i18n.global.locale.value).toBe('km')
    vi.useRealTimers()
    delete (document as any).fonts
  })
})
