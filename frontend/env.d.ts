/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  readonly VITE_APP_MODE?: 'preview' | 'prod'
  readonly VITE_PREVIEW_ROLE?: 'user' | 'hospital' | 'doctor' | 'admin'
  readonly VITE_API_URL?: string
  readonly VITE_ROOT_DOMAIN?: string
  readonly VITE_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
