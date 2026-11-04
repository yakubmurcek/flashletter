import { describe, it, expect } from 'vitest'
import { fixEmailLinks } from '@/lib/utils/email-links'

const BASE = 'https://acme.com/landing'

describe('fixEmailLinks', () => {
  it('resolves a root-relative link against the landing URL', () => {
    expect(fixEmailLinks('Go [Sign up](/register) now.', BASE)).toBe(
      'Go [Sign up](https://acme.com/register) now.',
    )
  })

  it('resolves a path-relative link against the landing URL', () => {
    expect(fixEmailLinks('[Prices](cenik)', BASE)).toBe('[Prices](https://acme.com/cenik)')
  })

  it('resolves a protocol-relative link to https', () => {
    expect(fixEmailLinks('[Docs](//docs.acme.com/start)', BASE)).toBe(
      '[Docs](https://docs.acme.com/start)',
    )
  })

  it('resolves an #anchor against the landing page', () => {
    expect(fixEmailLinks('[See pricing](#pricing)', BASE)).toBe(
      '[See pricing](https://acme.com/landing#pricing)',
    )
  })

  it('replaces a javascript: link with the landing URL', () => {
    expect(fixEmailLinks('[Click](javascript:alert(1))', BASE)).toBe(`[Click](${BASE})`)
  })

  it('replaces javascript: hidden behind whitespace or odd casing', () => {
    expect(fixEmailLinks('[Click](<  JavaScript:alert(1)>)', BASE)).toBe(`[Click](${BASE})`)
  })

  it('replaces other non-web schemes with the landing URL', () => {
    expect(fixEmailLinks('[Call](tel:+420123456789)', BASE)).toBe(`[Call](${BASE})`)
    expect(fixEmailLinks('[X](data:text/html,hi)', BASE)).toBe(`[X](${BASE})`)
  })

  it('keeps mailto: links', () => {
    const md = 'Write to [support](mailto:help@acme.com).'
    expect(fixEmailLinks(md, BASE)).toBe(md)
  })

  it('keeps already-absolute http(s) links byte for byte', () => {
    const md = '[Start](https://acme.com/start?ref=email&x=1) and [old](http://acme.com/a)'
    expect(fixEmailLinks(md, BASE)).toBe(md)
  })

  it('keeps an absolute URL with parentheses intact', () => {
    const md = 'Read [the wiki](https://en.wikipedia.org/wiki/Email_(disambiguation)) first.'
    expect(fixEmailLinks(md, BASE)).toBe(md)
  })

  it('resolves a relative URL with parentheses', () => {
    expect(fixEmailLinks('[Guide](/docs/setup_(v2)) today', BASE)).toBe(
      '[Guide](https://acme.com/docs/setup_(v2)) today',
    )
  })

  it('keeps a link title', () => {
    expect(fixEmailLinks('[Sign up](/register "Create an account")', BASE)).toBe(
      '[Sign up](https://acme.com/register "Create an account")',
    )
  })

  it('handles link text with brackets and several links on a line', () => {
    expect(fixEmailLinks('[Try [beta]](/beta) or [buy](/buy)', BASE)).toBe(
      '[Try [beta]](https://acme.com/beta) or [buy](https://acme.com/buy)',
    )
  })

  it('resolves relative images but never swaps an image for the landing page', () => {
    expect(fixEmailLinks('![Logo](/logo.png)', BASE)).toBe('![Logo](https://acme.com/logo.png)')
    expect(fixEmailLinks('![Logo](javascript:x)', BASE)).toBe('Logo')
  })

  it('leaves text that only looks like a link alone', () => {
    const md = 'Prices [in CZK] (incl. VAT) and a [ref] here, plus a lone ] ( bracket.'
    expect(fixEmailLinks(md, BASE)).toBe(md)
  })

  it('is idempotent', () => {
    const once = fixEmailLinks('[a](/x) [b](#y) [c](javascript:z) [d](//cdn.acme.com/q)', BASE)
    expect(fixEmailLinks(once, BASE)).toBe(once)
  })

  it('without a usable landing URL, unwraps links it cannot fix and keeps good ones', () => {
    const md = '[Sign up](/register), [bad](javascript:x), [ok](https://acme.com/)'
    const expected = 'Sign up, bad, [ok](https://acme.com/)'
    expect(fixEmailLinks(md)).toBe(expected)
    expect(fixEmailLinks(md, 'not a url')).toBe(expected)
    expect(fixEmailLinks(md, 'javascript:alert(1)')).toBe(expected)
  })

  it('returns content without links unchanged', () => {
    expect(fixEmailLinks('', BASE)).toBe('')
    expect(fixEmailLinks('Hi,\n\nNo links here.\n\nThe Acme team', BASE)).toBe(
      'Hi,\n\nNo links here.\n\nThe Acme team',
    )
  })
})
