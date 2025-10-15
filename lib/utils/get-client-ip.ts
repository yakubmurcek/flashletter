import { NextRequest } from 'next/server'

/**
 * Extract client IP address from Next.js request
 * Checks various headers in order of precedence
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip')

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  if (realIp) {
    return realIp
  }

  // Fallback to anonymous if no IP can be determined
  return 'anonymous'
}
