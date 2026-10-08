// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { userMessageForUnsafeUrl } from '@/lib/utils/url-safety'

const err = (message: string) => Object.assign(new Error(message), { name: 'UnsafeUrlError' })

describe('userMessageForUnsafeUrl', () => {
  it('treats a dotless host as a typo, not a block', () => {
    expect(userMessageForUnsafeUrl(err('Cannot resolve host: notaurl'))).toMatch(
      /doesn't look like a web address/,
    )
  })

  it('names the domain it could not find', () => {
    expect(userMessageForUnsafeUrl(err('Cannot resolve host: nope-xyz.com'))).toContain(
      "couldn't find nope-xyz.com",
    )
  })

  it('explains private addresses without leaking internals', () => {
    const msg = userMessageForUnsafeUrl(err('Refusing to fetch localhost'))
    expect(msg).toMatch(/isn't reachable from the internet/)
    expect(msg).not.toMatch(/Refusing/)
  })

  it('never says "not allowed"', () => {
    for (const m of ['Invalid URL', 'Only http(s) URLs are allowed', 'Response exceeds 5 bytes']) {
      expect(userMessageForUnsafeUrl(err(m))).not.toMatch(/not allowed/i)
    }
  })
})
