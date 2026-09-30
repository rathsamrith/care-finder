// Hospital sites live on <slug>.<VITE_ROOT_DOMAIN>. Everything else (the root
// domain itself, www., app.) is the normal Care Finder app.
const PLATFORM_LABELS = new Set(['www', 'app', 'api', 'admin'])
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/

export function resolveTenant(hostname: string, rootDomain?: string, devSiteParam?: string | null) {
  const host = hostname.toLowerCase()
  const root = rootDomain?.trim().toLowerCase()

  if (root && host.endsWith(`.${root}`)) {
    const label = host.slice(0, -(root.length + 1))
    // Only a single label counts (a.b.root is not a tenant).
    if (LABEL_RE.test(label) && !PLATFORM_LABELS.has(label)) return label
    return null
  }

  // Dev convenience: http://localhost:5173/?site=demo
  if (devSiteParam && LABEL_RE.test(devSiteParam)) return devSiteParam
  return null
}

const params = new URLSearchParams(window.location.search)

export const tenant: string | null = resolveTenant(
  window.location.hostname,
  import.meta.env.VITE_ROOT_DOMAIN,
  import.meta.env.DEV ? params.get('site') : null
)

// Public address of a hospital's site (used by the editor's "Open site" link).
export function siteUrl(slug: string) {
  const root = import.meta.env.VITE_ROOT_DOMAIN
  if (!root) return `${window.location.origin}/?site=${slug}`
  const port = window.location.port ? `:${window.location.port}` : ''
  return `${window.location.protocol}//${slug}.${root}${port}`
}

// Sites don't share the main app's login (tokens are per-origin), so anything
// that needs an account links out to the main app.
export function mainAppUrl(path = '/') {
  const base =
    import.meta.env.VITE_APP_URL ||
    (import.meta.env.VITE_ROOT_DOMAIN
      ? `${window.location.protocol}//${import.meta.env.VITE_ROOT_DOMAIN}${window.location.port ? `:${window.location.port}` : ''}`
      : window.location.origin)
  return `${base.replace(/\/$/, '')}${path}`
}
