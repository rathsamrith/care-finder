// CORS_ORIGIN: comma-separated exact origins (e.g. the main app).
// ROOT_DOMAIN: when set (e.g. carefinder.com), every https://<label>.<root>
// origin is allowed too - hospital subdomain sites call this API directly.
// No configuration => no cross-origin access (previously: reflect any origin).
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildCorsOrigin(corsOrigin?: string, rootDomain?: string) {
  const exact = (corsOrigin ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const root = rootDomain?.trim().toLowerCase();
  const subdomain = root
    ? new RegExp('^https://[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.' + escapeRegExp(root) + '$')
    : null;

  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    // No Origin header = same-origin or non-browser client; CORS doesn't apply.
    if (!origin) return cb(null, true);
    cb(null, exact.includes(origin) || (subdomain?.test(origin) ?? false));
  };
}
