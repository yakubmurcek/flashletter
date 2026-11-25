import type { NextRequest } from 'next/server'

/**
 * Extract the real client IP, resilient to header spoofing.
 *
 * Production is served directly by Vercel (no Cloudflare in front), so only
 * headers Vercel sets itself are trusted. `cf-connecting-ip` is deliberately
 * ignored: without Cloudflare in the path, any client can send it.
 *
 * Order:
 * 1. `x-real-ip` — set by Vercel to the connecting client's IP.
 * 2. `x-vercel-forwarded-for` — also set by Vercel, a single client IP.
 * 3. The LAST `x-forwarded-for` entry — the leftmost slots can be set by the
 *    client; the trusted proxy appends the real IP at the end.
 */
export function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const vercelForwarded = req.headers.get('x-vercel-forwarded-for')
  if (vercelForwarded) {
    const first = vercelForwarded
      .split(',')
      .map((s) => s.trim())
      .find(Boolean)
    if (first) return first
  }

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
