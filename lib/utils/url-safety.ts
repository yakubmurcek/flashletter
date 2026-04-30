import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * URL-safety helpers for the scrape pipeline.
 *
 * Why this exists: the scrape endpoints take a user-supplied URL and fetch it
 * server-side (and navigate to it in Playwright). Without these guards an
 * attacker can point us at internal services — most importantly
 * `169.254.169.254` (cloud metadata, leaks IAM creds) and any other
 * private/loopback range — turning the scraper into an SSRF gadget.
 *
 * Defenses applied:
 *  - http(s) scheme only (blocks file://, gopher://, javascript:, etc.)
 *  - reject IP-literal hostnames in private/loopback/link-local ranges
 *  - DNS-resolve hostnames and reject if any A/AAAA record sits in those
 *    same ranges (blocks `evil.com → 127.0.0.1` style attacks)
 *  - response size + timeout caps, to also turn slow/huge URLs into errors
 *
 * Not defended against here: full DNS-rebinding (the resolver could return a
 * different IP at fetch time). Mitigation would require pinning to the
 * resolved IP and overriding the Host header — out of scope for this fix.
 */

const MAX_FETCH_BYTES = 5 * 1024 * 1024 // 5 MB — landing pages don't need more
const FETCH_TIMEOUT_MS = 15_000

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((s) => Number(s))
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    // Unparseable → treat as unsafe
    return true
  }
  const [a, b] = parts
  if (a === 0) return true // 0.0.0.0/8
  if (a === 10) return true // 10.0.0.0/8
  if (a === 127) return true // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 CGN
  if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15 benchmarking
  if (a >= 224) return true // multicast / reserved
  return false
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::' || lower === '::1') return true
  if (
    lower.startsWith('fe80:') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  ) {
    return true // fe80::/10 link-local
  }
  if (lower.startsWith('fc') || lower.startsWith('fd')) {
    return true // fc00::/7 unique local
  }
  if (lower.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — extract and re-check
    const v4 = lower.slice(7)
    if (isIP(v4) === 4) return isPrivateIPv4(v4)
  }
  return false
}

class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

export function isUnsafeUrlError(error: unknown): error is UnsafeUrlError {
  return error instanceof Error && error.name === 'UnsafeUrlError'
}

export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new UnsafeUrlError('Invalid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http(s) URLs are allowed')
  }

  const host = url.hostname
  if (!host) {
    throw new UnsafeUrlError('URL is missing a hostname')
  }

  const lowered = host.toLowerCase()
  if (lowered === 'localhost' || lowered.endsWith('.localhost')) {
    throw new UnsafeUrlError('Refusing to fetch localhost')
  }

  const ipVersion = isIP(host)
  if (ipVersion === 4 && isPrivateIPv4(host)) {
    throw new UnsafeUrlError('Refusing to fetch private/internal address')
  }
  if (ipVersion === 6 && isPrivateIPv6(host)) {
    throw new UnsafeUrlError('Refusing to fetch private/internal address')
  }

  if (ipVersion === 0) {
    let records: Array<{ address: string; family: number }>
    try {
      records = await lookup(host, { all: true })
    } catch {
      throw new UnsafeUrlError(`Cannot resolve host: ${host}`)
    }
    for (const record of records) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        throw new UnsafeUrlError('Refusing to fetch private/internal address')
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        throw new UnsafeUrlError('Refusing to fetch private/internal address')
      }
    }
  }

  return url
}

export interface SafeFetchResult {
  ok: boolean
  status: number
  statusText: string
  finalUrl: string
  text: string
}

/**
 * Fetch a user-supplied URL with SSRF guards, a timeout, and a body-size cap.
 * Re-validates after redirects so a 302 → internal-IP can't slip through.
 */
export async function safeFetch(url: string, init?: RequestInit): Promise<SafeFetchResult> {
  await assertSafeUrl(url)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: 'follow',
    })

    if (response.url && response.url !== url) {
      try {
        await assertSafeUrl(response.url)
      } catch (err) {
        // Swallow the body if we can't safely report on it.
        try {
          await response.body?.cancel()
        } catch {
          // ignore
        }
        throw err
      }
    }

    if (!response.body) {
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        finalUrl: response.url || url,
        text: '',
      }
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (!value) continue
        total += value.byteLength
        if (total > MAX_FETCH_BYTES) {
          await reader.cancel()
          throw new UnsafeUrlError(`Response exceeds ${MAX_FETCH_BYTES} bytes`)
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }

    const merged = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.byteLength
    }
    const text = new TextDecoder('utf-8').decode(merged)

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      finalUrl: response.url || url,
      text,
    }
  } finally {
    clearTimeout(timer)
  }
}
