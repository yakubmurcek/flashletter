// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Route } from 'playwright-core'

const { lookupMock, launchMock } = vi.hoisted(() => ({
  lookupMock: vi.fn(),
  launchMock: vi.fn(),
}))
vi.mock('node:dns/promises', () => ({ lookup: lookupMock }))
vi.mock('playwright-core', () => ({ chromium: { launch: launchMock } }))

import { createSafeRouteHandler, scrapeWithPlaywright } from '@/lib/utils/playwright-scraper'
import { at } from './_helpers/at'

const DNS: Record<string, string> = {
  'public.example': '93.184.216.34',
  'internal.example': '10.0.0.5',
}

beforeEach(() => {
  lookupMock.mockReset()
  lookupMock.mockImplementation(async (host: string) => {
    if (!DNS[host]) throw Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })
    return [{ address: DNS[host], family: 4 }]
  })
  launchMock.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function fakeRoute(url: string) {
  return {
    request: () => ({ url: () => url }),
    continue: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn().mockResolvedValue(undefined),
  }
}

async function routeVerdict(url: string, handler = createSafeRouteHandler()) {
  const route = fakeRoute(url)
  await handler(route as unknown as Route)
  if (route.continue.mock.calls.length) return 'continue'
  if (route.abort.mock.calls.length) return 'abort'
  return 'none'
}

describe('createSafeRouteHandler', () => {
  it('aborts a request to the cloud metadata IP', async () => {
    expect(await routeVerdict('http://169.254.169.254/latest/meta-data/')).toBe('abort')
  })

  it('aborts a request to a hostname that resolves to a private IP', async () => {
    expect(await routeVerdict('https://internal.example/admin')).toBe('abort')
  })

  it('aborts non-http(s) schemes', async () => {
    expect(await routeVerdict('file:///etc/passwd')).toBe('abort')
  })

  it('lets public requests and inline data: URLs through', async () => {
    expect(await routeVerdict('https://public.example/app.js')).toBe('continue')
    expect(await routeVerdict('data:image/png;base64,AAAA')).toBe('continue')
  })

  it('checks each hostname once per page', async () => {
    const check = vi.fn().mockResolvedValue(undefined)
    const handler = createSafeRouteHandler(check)
    await routeVerdict('https://public.example/a.css', handler)
    await routeVerdict('https://public.example/b.js', handler)
    expect(check).toHaveBeenCalledTimes(1)
  })

  it('does not throw when the page closed before the route was resolved', async () => {
    const route = fakeRoute('https://public.example/')
    route.continue.mockRejectedValue(new Error('Target page has been closed'))
    await expect(createSafeRouteHandler()(route as unknown as Route)).resolves.toBeUndefined()
  })
})

interface FakeRequest {
  url: () => string
  redirectedFrom: () => FakeRequest | null
}

function chain(...urls: string[]): FakeRequest {
  let prev: FakeRequest | null = null
  for (const url of urls) {
    const from: FakeRequest | null = prev
    prev = { url: () => url, redirectedFrom: () => from }
  }
  return prev as FakeRequest
}

function fakeBrowser(opts: { redirects: string[]; finalUrl: string }) {
  const page = {
    route: vi.fn().mockResolvedValue(undefined),
    setDefaultTimeout: vi.fn(),
    goto: vi.fn().mockResolvedValue({
      ok: () => true,
      status: () => 200,
      statusText: () => 'OK',
      request: () => chain(...opts.redirects),
    }),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    url: vi.fn(() => opts.finalUrl),
    content: vi.fn().mockResolvedValue('<html><body><main>Hello world</main></body></html>'),
    close: vi.fn().mockResolvedValue(undefined),
  }
  const browser = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
  }
  launchMock.mockResolvedValue(browser)
  return { page, browser }
}

describe('scrapeWithPlaywright SSRF guard', () => {
  it('routes every request through the guard before navigating', async () => {
    const { page, browser } = fakeBrowser({
      redirects: ['https://public.example/'],
      finalUrl: 'https://public.example/',
    })
    const result = await scrapeWithPlaywright('https://public.example/')
    expect(page.route).toHaveBeenCalledWith('**/*', expect.any(Function))
    expect(at(page.route.mock.invocationCallOrder, 0)).toBeLessThan(
      at(page.goto.mock.invocationCallOrder, 0),
    )
    expect(browser.newPage).toHaveBeenCalledWith(
      expect.objectContaining({ serviceWorkers: 'block' }),
    )
    expect(result.content).toContain('Hello world')
  })

  // Links on a rendered page are resolved against where it ended up, so a
  // relative CTA never reaches the writer (and from there an email).
  it('resolves relative links against the final URL', async () => {
    const { page } = fakeBrowser({
      redirects: ['https://public.example/', 'https://public.example/start'],
      finalUrl: 'https://public.example/start',
    })
    page.content.mockResolvedValue(
      '<html><body><main><p>Hello world</p><a href="/register">Sign up</a></main></body></html>',
    )
    const result = await scrapeWithPlaywright('https://public.example/')
    expect(result.content).toContain('href="https://public.example/register"')
  })

  it('refuses a page that redirected through a private address', async () => {
    const { page } = fakeBrowser({
      redirects: ['https://public.example/', 'http://169.254.169.254/', 'https://public.example/x'],
      finalUrl: 'https://public.example/x',
    })
    const error = await scrapeWithPlaywright('https://public.example/').catch((e) => e)
    expect(error).toMatchObject({
      name: 'UnsafeUrlError',
      message: 'Refusing to fetch private/internal address',
    })
    expect(page.content).not.toHaveBeenCalled()
  })

  it('refuses a page that ended up on a private URL after load', async () => {
    const { page } = fakeBrowser({
      redirects: ['https://public.example/'],
      finalUrl: 'http://127.0.0.1:3000/admin',
    })
    const error = await scrapeWithPlaywright('https://public.example/').catch((e) => e)
    expect(error).toMatchObject({
      name: 'UnsafeUrlError',
      message: 'Refusing to fetch private/internal address',
    })
    expect(page.content).not.toHaveBeenCalled()
  })
})
