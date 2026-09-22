// Deploy mode, chosen at build time with VITE_APP_MODE:
//   prod    (default) - every request goes to the real API (VITE_API_URL)
//   preview           - no network: requests are answered by src/mocks
// Anything other than the exact string "preview" means prod, so a typo can
// never silently ship a mock-backed production build.
export type AppMode = 'preview' | 'prod'

export const resolveAppMode = (value: unknown): AppMode => (value === 'preview' ? 'preview' : 'prod')

export const appMode: AppMode = resolveAppMode(import.meta.env.VITE_APP_MODE)
export const isPreview = appMode === 'preview'
export const isProd = appMode === 'prod'
