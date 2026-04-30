import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('unsubscribe-token', () => {
  const ORIGINAL_SECRET = process.env.WAITLIST_UNSUBSCRIBE_SECRET

  beforeEach(() => {
    process.env.WAITLIST_UNSUBSCRIBE_SECRET = 'test-secret-for-vitest-only'
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.WAITLIST_UNSUBSCRIBE_SECRET
    } else {
      process.env.WAITLIST_UNSUBSCRIBE_SECRET = ORIGINAL_SECRET
    }
  })

  it('round-trips a signed email', async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } =
      await import('@/lib/utils/unsubscribe-token')
    const token = signUnsubscribeToken('user@example.com')
    expect(verifyUnsubscribeToken(token)).toBe('user@example.com')
  })

  it('normalizes email casing and whitespace before signing', async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } =
      await import('@/lib/utils/unsubscribe-token')
    const token = signUnsubscribeToken('  USER@Example.com  ')
    expect(verifyUnsubscribeToken(token)).toBe('user@example.com')
  })

  it('rejects a tampered email', async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } =
      await import('@/lib/utils/unsubscribe-token')
    const token = signUnsubscribeToken('user@example.com')
    // Replace the email portion with a base64url of a different address.
    const [, sig] = token.split('.')
    const fakeEmail = Buffer.from('attacker@example.com').toString('base64url')
    const tampered = `${fakeEmail}.${sig}`
    expect(verifyUnsubscribeToken(tampered)).toBeNull()
  })

  it('rejects a tampered signature', async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } =
      await import('@/lib/utils/unsubscribe-token')
    const token = signUnsubscribeToken('user@example.com')
    const [encodedEmail] = token.split('.')
    const garbageSig = Buffer.from('not-the-real-signature-zz').toString('base64url')
    expect(verifyUnsubscribeToken(`${encodedEmail}.${garbageSig}`)).toBeNull()
  })

  it('rejects malformed tokens', async () => {
    const { verifyUnsubscribeToken } = await import('@/lib/utils/unsubscribe-token')
    expect(verifyUnsubscribeToken('')).toBeNull()
    expect(verifyUnsubscribeToken('no-dot')).toBeNull()
    expect(verifyUnsubscribeToken('a.b.c')).toBeNull()
  })

  it('rejects tokens signed with a different secret', async () => {
    const { signUnsubscribeToken } = await import('@/lib/utils/unsubscribe-token')
    const token = signUnsubscribeToken('user@example.com')
    process.env.WAITLIST_UNSUBSCRIBE_SECRET = 'different-secret'
    // Re-import fresh module — the secret is read at call time, but explicit
    // cache-bust documents the intent.
    const { verifyUnsubscribeToken } = await import('@/lib/utils/unsubscribe-token')
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('returns null instead of throwing when the secret is unset', async () => {
    delete process.env.WAITLIST_UNSUBSCRIBE_SECRET
    const { verifyUnsubscribeToken } = await import('@/lib/utils/unsubscribe-token')
    expect(verifyUnsubscribeToken('any.token')).toBeNull()
  })
})
