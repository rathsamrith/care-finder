import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'

import en from '@/locales/en.json'
import km from '@/locales/km.json'

export const SUPPORTED_LOCALES = ['en', 'km'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

const STORAGE_KEY = 'cf_locale'

const isSupported = (value: unknown): value is AppLocale =>
  SUPPORTED_LOCALES.includes(value as AppLocale)

const detectLocale = (): AppLocale => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isSupported(saved)) return saved
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('km') ? 'km' : 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en, km }
})

// <html lang> drives the :lang(km) line-height rules in main.css.
export const setLocale = (locale: AppLocale) => {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* storage unavailable */
  }
}

document.documentElement.lang = i18n.global.locale.value

// Noto Sans Khmer is self-hosted (@fontsource, imported in main.ts), one file
// per weight, and a browser only fetches a file when that weight is first drawn
// with Khmer text - so the first switch to Khmer used to flash a fallback font
// and then jump. Loading the weights the UI uses ahead of time (idle warm-up,
// and again before a switch) avoids that.
const KHMER_WEIGHTS = [400, 500, 600, 700]

const loadKhmerFont = (): Promise<void> => {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  return Promise.all(KHMER_WEIGHTS.map((w) => document.fonts.load(`${w} 1em "Noto Sans Khmer"`, 'ក'))).then(
    () => undefined,
    () => undefined
  )
}

export const warmFonts = () => {
  const run = () => void loadKhmerFont()
  if ('requestIdleCallback' in window) window.requestIdleCallback(run)
  else setTimeout(run, 1500)
}

// Smooth language switch: make sure the Khmer font is ready (but never wait
// more than ~1.2s), then swap everything inside a View Transition so the new
// font/line-height/text lengths cross-fade instead of jumping in one frame.
// Browsers without the API, or users who prefer reduced motion, switch instantly.
export async function changeLocale(locale: AppLocale) {
  if (locale === i18n.global.locale.value) return
  if (locale === 'km') {
    await Promise.race([loadKhmerFont(), new Promise<void>((resolve) => setTimeout(resolve, 1200))])
  }

  const apply = async () => {
    setLocale(locale)
    await nextTick()
  }
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const startViewTransition = (document as any).startViewTransition?.bind(document)
  if (startViewTransition && !reduceMotion) {
    await startViewTransition(apply).updateCallbackDone.catch(() => undefined)
  } else {
    await apply()
  }
}

export default i18n
