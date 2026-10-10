const PROBE_ORIGIN = 'https://flashletter.invalid'

/**
 * The same-site path a `?redirectTo=` value points at, or `fallback`.
 *
 * Resolves the target the way `new URL` and the browser will, then checks the
 * origin. Prefix checks alone let `/\evil.com` and `/<tab>/evil.com` through:
 * URL parsing treats `\` as `/` and drops tabs and newlines, so both become
 * `//evil.com`, another site.
 */
export function safeRedirectPath(target: unknown, fallback = '/campaigns'): string {
  if (typeof target !== 'string' || !target.startsWith('/')) return fallback
  let url: URL
  try {
    url = new URL(target, PROBE_ORIGIN)
  } catch {
    return fallback
  }
  if (url.origin !== PROBE_ORIGIN) return fallback
  return `${url.pathname}${url.search}${url.hash}`
}

/** `path` with `redirectTo` carried along, or bare when it is the default. */
export function withRedirectTo(path: string, redirectTo: string, defaultPath = '/campaigns') {
  return redirectTo === defaultPath ? path : `${path}?redirectTo=${encodeURIComponent(redirectTo)}`
}
