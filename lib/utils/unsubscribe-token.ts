import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Signed unsubscribe tokens for waitlist emails.
 *
 * The previous flow accepted just the email address, so anyone who knew (or
 * guessed) someone's email could unsubscribe them. We now embed an HMAC of
 * the email in the unsubscribe link so the link, not the address, is the
 * authority. The bare-email path is gone: /api/waitlist/unsubscribe accepts
 * only a token, and people without the link write to the contact address.
 * Every waitlist email must link to /unsubscribe?token=<signUnsubscribeToken(email)>.
 *
 * Token format: `<base64url(email)>.<base64url(hmac-sha256(email))>`
 *
 * The secret comes from `WAITLIST_UNSUBSCRIBE_SECRET`. If it's missing in
 * production, signing will throw — fail loud rather than ship a token signed
 * with the empty string.
 */

const ENCODING = 'utf8'

function getSecret(): string {
  const secret = process.env.WAITLIST_UNSUBSCRIBE_SECRET
  if (!secret) {
    throw new Error(
      'WAITLIST_UNSUBSCRIBE_SECRET is not set; cannot sign or verify unsubscribe tokens',
    )
  }
  return secret
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, ENCODING) : input
  return buf.toString('base64url')
}

function base64UrlDecodeToString(encoded: string): string | null {
  try {
    return Buffer.from(encoded, 'base64url').toString(ENCODING)
  } catch {
    return null
  }
}

export function signUnsubscribeToken(email: string): string {
  const secret = getSecret()
  const payload = normalizeEmail(email)
  const sig = createHmac('sha256', secret).update(payload).digest()
  return `${base64UrlEncode(payload)}.${base64UrlEncode(sig)}`
}

/**
 * Returns the email if the token is well-formed and the signature matches,
 * otherwise null. Constant-time signature comparison.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  // Catch the case where the secret is missing — refuse to verify.
  let secret: string
  try {
    secret = getSecret()
  } catch {
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [encodedEmail, encodedSig] = parts
  const email = base64UrlDecodeToString(encodedEmail)
  if (!email) return null

  const expectedSig = createHmac('sha256', secret).update(email).digest()
  let providedSig: Buffer
  try {
    providedSig = Buffer.from(encodedSig, 'base64url')
  } catch {
    return null
  }
  if (providedSig.length !== expectedSig.length) return null
  return timingSafeEqual(providedSig, expectedSig) ? email : null
}
