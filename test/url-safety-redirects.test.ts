// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }))
vi.mock('node:dns/promises', () => ({ lookup: lookupMock }))

import { assertSafeUrl, safeFetch } from '@/lib/utils/url-safety'

// Fake DNS: public.example and other.example are public, internal.example is
// a private address, everything else does not resolve.
const DNS: Record<string, Array<{ address: string; family: number }>> = {
  'public.example': [{ address: '93.184.216.34', family: 4 }],
  'other.example': [{ address: '93.184.216.35', family: 4 }],
  'internal.example': [{ address: '10.0.0.5', family: 4 }],
  'mixed.example': [
    { address: '93.184.216.34', family: 4 },
    { address: '127.0.0.1', family: 4 },
  ],
  'mapped.example': [{ address: '::ffff:7f00:1', family: 6 }],
}

const redirect = (location: string, status = 302) =>
  new Response(null, { status, headers: { location } })

const fetchMock = vi.fn()
const fetchedUrls = () => fetchMock.mock.calls.map(([url]) => String(url))

beforeEach(() => {
  lookupMock.mockReset()
  lookupMock.mockImplementation(async (host: string) => {
    const records = DNS[host]
    if (!records) throw Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })
    return records
  })
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('safeFetch redirects', () => {
  it('follows redirects manually so every hop can be checked', async () => {
    fetchMock.mockResolvedValueOnce(new Response('ok'))
    await safeFetch('https://public.example/')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
  })

  it('refuses a redirect to the cloud metadata IP without requesting it', async () => {
    fetchMock.mockResolvedValueOnce(redirect('http://169.254.169.254/latest/meta-data/'))
    await expect(safeFetch('https://public.example/')).rejects.toThrow(
      'Refusing to fetch private/internal address',
    )
    expect(fetchedUrls()).toEqual(['https://public.example/'])
  })

  it('refuses a redirect to loopback without requesting it', async () => {
    fetchMock.mockResolvedValueOnce(redirect('http://127.0.0.1:8080/admin', 301))
    await expect(safeFetch('https://public.example/')).rejects.toThrow(
      'Refusing to fetch private/internal address',
    )
    expect(fetchedUrls()).toEqual(['https://public.example/'])
  })

  it('refuses a redirect to a hostname that resolves to a private IP', async () => {
    fetchMock.mockResolvedValueOnce(redirect('https://internal.example/secrets'))
    await expect(safeFetch('https://public.example/')).rejects.toThrow(
      'Refusing to fetch private/internal address',
    )
    expect(fetchedUrls()).toEqual(['https://public.example/'])
  })

  it('resolves a relative Location against the current URL', async () => {
    fetchMock
      .mockResolvedValueOnce(redirect('/pricing?x=1'))
      .mockResolvedValueOnce(new Response('<h1>Pricing</h1>'))
    const result = await safeFetch('https://public.example/start/')
    expect(fetchedUrls()).toEqual([
      'https://public.example/start/',
      'https://public.example/pricing?x=1',
    ])
    expect(result.finalUrl).toBe('https://public.example/pricing?x=1')
    expect(result.text).toBe('<h1>Pricing</h1>')
  })

  it('checks a protocol-relative Location before following it', async () => {
    fetchMock.mockResolvedValueOnce(redirect('//127.0.0.1/admin'))
    await expect(safeFetch('https://public.example/')).rejects.toThrow(
      'Refusing to fetch private/internal address',
    )
    expect(fetchedUrls()).toEqual(['https://public.example/'])
  })

  it('gives up after 5 redirects', async () => {
    let hop = 0
    fetchMock.mockImplementation(async () => redirect(`/hop-${++hop}`))
    await expect(safeFetch('https://public.example/')).rejects.toThrow('Too many redirects')
    // The first request plus 5 followed hops; the 6th Location is never fetched.
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('still follows a public → public redirect', async () => {
    fetchMock
      .mockResolvedValueOnce(redirect('https://other.example/landing', 308))
      .mockResolvedValueOnce(new Response('hello', { status: 200, statusText: 'OK' }))
    const result = await safeFetch('https://public.example/')
    expect(result).toEqual({
      ok: true,
      status: 200,
      statusText: 'OK',
      finalUrl: 'https://other.example/landing',
      text: 'hello',
    })
  })
})

describe('assertSafeUrl address checks', () => {
  const PRIVATE = 'Refusing to fetch private/internal address'

  it.each([
    'http://[::1]/',
    'http://[::]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[::ffff:a9fe:a9fe]/',
    'http://[fd00::1]/',
    'http://[fe80::1]/',
    'http://0.0.0.0/',
    'http://100.64.0.1/',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
  ])('refuses the private literal %s without a DNS lookup', async (url) => {
    await expect(assertSafeUrl(url)).rejects.toThrow(PRIVATE)
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it('accepts a public IPv6 literal', async () => {
    await expect(assertSafeUrl('http://[2606:4700::1111]/')).resolves.toBeInstanceOf(URL)
  })

  it('refuses a hostname whose AAAA record is an IPv4-mapped loopback', async () => {
    await expect(assertSafeUrl('https://mapped.example/')).rejects.toThrow(PRIVATE)
  })

  it('refuses a hostname when any one of its records is private', async () => {
    await expect(assertSafeUrl('https://mixed.example/')).rejects.toThrow(PRIVATE)
    expect(lookupMock).toHaveBeenCalledWith('mixed.example', { all: true })
  })
})
