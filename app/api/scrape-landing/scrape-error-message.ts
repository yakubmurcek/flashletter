import { isUnsafeUrlError, userMessageForUnsafeUrl } from '@/lib/utils/url-safety'

/** Thrown by the scrape routes when the landing page answers with a non-2xx status. */
export class UpstreamStatusError extends Error {
  constructor(
    readonly status: number,
    statusText: string,
  ) {
    super(`Failed to fetch: ${status} ${statusText}`)
    this.name = 'UpstreamStatusError'
  }
}

const MESSAGES = {
  tooSlow: 'That site took too long to respond. Try again in a moment.',
  unreachable: "We couldn't reach that site. Check the address and try again.",
  notFound: "We couldn't find that site. Check the address for typos and try again.",
  blocked:
    'That site blocked our visit. Some sites turn away automated readers. Try another page on your site.',
  pageMissing: "We couldn't find that page on the site. Check the address and try again.",
  siteTrouble: 'That site is having trouble loading right now. Try again in a moment.',
  generic: "We couldn't read that page. Try again, or paste a different page from your site.",
}

const TIMEOUT_CODES = new Set([
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
])
const NOT_FOUND_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN'])
const UNREACHABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'UND_ERR_SOCKET',
])

function messageForStatus(status: number): string {
  if (status === 401 || status === 403 || status === 429) return MESSAGES.blocked
  if (status === 404 || status === 410) return MESSAGES.pageMissing
  if (status >= 500) return MESSAGES.siteTrouble
  return MESSAGES.generic
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const { code, cause } = error as { code?: unknown; cause?: unknown }
  if (typeof code === 'string') return code
  return cause ? errorCode(cause) : undefined
}

/**
 * Turn whatever a scrape threw into copy a visitor can act on. Raw messages
 * ("fetch failed", "This operation was aborted", ECONNREFUSED…) never leave
 * the server; callers log and report the original error before calling this.
 */
export function userMessageForScrapeError(error: unknown): string {
  if (isUnsafeUrlError(error)) return userMessageForUnsafeUrl(error)
  if (error instanceof UpstreamStatusError) return messageForStatus(error.status)
  // An aborted fetch throws a DOMException, which isn't always `instanceof Error`.
  const name = (error as { name?: unknown } | null)?.name
  if (name === 'AbortError' || name === 'TimeoutError') return MESSAGES.tooSlow
  if (!(error instanceof Error)) return MESSAGES.generic

  // Node's fetch throws TypeError('fetch failed') with the socket error as `cause`.
  const code = errorCode(error)
  if (code && TIMEOUT_CODES.has(code)) return MESSAGES.tooSlow
  if (code && NOT_FOUND_CODES.has(code)) return MESSAGES.notFound
  if ((code && UNREACHABLE_CODES.has(code)) || error.message === 'fetch failed') {
    return MESSAGES.unreachable
  }

  // Playwright wraps its failures: "Dynamic scraping failed: Failed to load page: 403 Forbidden"
  // or "Dynamic scraping failed: page.goto: Timeout 30000ms exceeded."
  const status = /Failed to (?:load page|fetch): (\d{3})/.exec(error.message)
  if (status) return messageForStatus(Number(status[1]))
  if (/Timeout \d+ms exceeded/i.test(error.message)) return MESSAGES.tooSlow
  if (/net::ERR_NAME_NOT_RESOLVED/.test(error.message)) return MESSAGES.notFound
  if (/net::ERR_/.test(error.message)) return MESSAGES.unreachable

  return MESSAGES.generic
}
