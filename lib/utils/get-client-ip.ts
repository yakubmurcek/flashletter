import { NextRequest } from 'next/server'

/**
 * Extract the real client IP, resilient to header spoofing.
 *
 * Order is deliberate: trust headers set by our edge proxy first, and never
 * trust the leftmost entry of `x-forwarded-for` — on Vercel, Cloudflare, and
 * most proxies, that slot can be set by the client and is preserved as-is.
 * The trusted client IP is appended by the proxy at the *end* of the list.
 */
export function getClientIp(req: NextRequest): string {
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }

  return 'anonymous'
}
