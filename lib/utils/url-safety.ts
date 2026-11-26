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
 *  - follow redirects by hand and run the same checks on every hop before
 *    requesting it (blocks `public.com → 302 → 169.254.169.254`)
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
  if (a === undefined || b === undefined) return true
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

/** Expand an IPv6 address into its eight 16-bit groups, or null if malformed. */
function ipv6Groups(ip: string): number[] | null {
  let s = ip.toLowerCase().replace(/%.*$/, '') // drop a zone id (fe80::1%eth0)
  // A dotted IPv4 tail (::ffff:1.2.3.4) becomes two hex groups
  const dotted = s.match(/^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (dotted) {
    const [a, b, c, d] = dotted.slice(2).map(Number)
    if (a === undefined || b === undefined || c === undefined || d === undefined) return null
    s = `${dotted[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
  }
  const halves = s.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const missing = 8 - head.length - tail.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail]
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null
  return groups.map((g) => parseInt(g, 16))
}

function isPrivateIPv6(ip: string): boolean {
  const g = ipv6Groups(ip)
  if (!g) return true // Unparseable → treat as unsafe
  const [g0, g1, g2, , , g5, g6, g7] = g
  if (g0 === undefined || g1 === undefined || g2 === undefined) return true
  if (g5 === undefined || g6 === undefined || g7 === undefined) return true
  const v4 = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`
  const zeros = (from: number, to: number) => g.slice(from, to).every((x) => x === 0)

  // ::/128, ::1 and the deprecated IPv4-compatible ::a.b.c.d (:: and ::1 land in 0.0.0.0/8)
  if (zeros(0, 6)) return isPrivateIPv4(v4(g6, g7))
  // ::ffff:0:0/96 IPv4-mapped — Node and WHATWG print it as ::ffff:7f00:1
  if (zeros(0, 5) && g5 === 0xffff) return isPrivateIPv4(v4(g6, g7))
  // 64:ff9b::/96 NAT64 and 2002::/16 6to4 both carry an IPv4 address
  if (g0 === 0x64 && g1 === 0xff9b && zeros(2, 6)) return isPrivateIPv4(v4(g6, g7))
  if (g0 === 0x2002) return isPrivateIPv4(v4(g1, g2))
  if ((g0 & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((g0 & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
  if ((g0 & 0xff00) === 0xff00) return true // ff00::/8 multicast
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

/**
 * What to tell the visitor. The internal messages ("Cannot resolve host",
 * "Refusing to fetch localhost") stay in logs; a visitor who mistyped a URL
 * should not read "URL not allowed" as if we were blocking them.
 */
export function userMessageForUnsafeUrl(error: Error): string {
  const msg = error.message
  if (msg.startsWith('Cannot resolve host')) {
    const host = msg.slice('Cannot resolve host: '.length)
    return host.includes('.')
      ? `We couldn't find ${host}. Check the address for typos and try again.`
      : "That doesn't look like a web address. Try something like https://yourproduct.com."
  }
  if (msg === 'Invalid URL' || msg === 'URL is missing a hostname') {
    return "That doesn't look like a web address. Try something like https://yourproduct.com."
  }
  if (msg === 'Only http(s) URLs are allowed') {
    return 'Use a web address that starts with http:// or https://.'
  }
  if (msg.startsWith('Refusing to fetch')) {
    return "That address isn't reachable from the internet. Paste your live landing page URL."
  }
  return "We couldn't open that page. Check the address and try again."
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

  // WHATWG keeps IPv6 literals bracketed ("[::1]"); isIP() needs them bare.
  const host = url.hostname.replace(/^\[(.*)\]$/, '$1')
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

const MAX_REDIRECTS = 5
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

async function discardBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel()
  } catch {
    // ignore
  }
}

/**
 * Fetch a user-supplied URL with SSRF guards, a timeout, and a body-size cap.
 * Redirects are followed by hand so every hop is checked BEFORE it is
 * requested — with `redirect: 'follow'` a public URL could 302 us onto
 * 169.254.169.254 and the request would already be out by the time we looked.
 */
export async function safeFetch(url: string, init?: RequestInit): Promise<SafeFetchResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    let currentUrl = url
    let requestInit: RequestInit = { ...init }
    let response: Response

    for (let redirects = 0; ; redirects++) {
      await assertSafeUrl(currentUrl)
      response = await fetch(currentUrl, {
        ...requestInit,
        signal: controller.signal,
        redirect: 'manual',
      })

      const location = response.headers.get('location')
      if (!REDIRECT_STATUSES.has(response.status) || !location) break

      // Free the socket before moving on to the next hop.
      await discardBody(response)
      if (redirects >= MAX_REDIRECTS) {
        throw new UnsafeUrlError('Too many redirects')
      }
      try {
        currentUrl = new URL(location, currentUrl).toString()
      } catch {
        throw new UnsafeUrlError('Invalid redirect URL')
      }
      // Same method rewrite browsers do: 303 always, 301/302 for POST, become GET.
      const method = requestInit.method?.toUpperCase()
      if (response.status === 303 || (response.status <= 302 && method === 'POST')) {
        requestInit = { ...requestInit, method: 'GET', body: undefined }
      }
    }

    if (!response.body) {
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        finalUrl: currentUrl,
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
      finalUrl: currentUrl,
      text,
    }
  } finally {
    clearTimeout(timer)
  }
}
