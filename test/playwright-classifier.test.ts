import { describe, it, expect } from 'vitest'
import { shouldUseDynamicScraping } from '@/lib/utils/playwright-scraper'

describe('shouldUseDynamicScraping', () => {
  it('returns true for minimal HTML (under 1000 chars)', () => {
    expect(shouldUseDynamicScraping('https://example.com', '<html></html>')).toBe(true)
  })

  it('returns false for substantial static HTML', () => {
    const html =
      '<html><head><title>Blog</title></head><body>' +
      '<article>' +
      'This is a real article with enough words to not trip the classifier. '.repeat(30) +
      '</article></body></html>'
    expect(shouldUseDynamicScraping('https://example.com', html)).toBe(false)
  })

  it('returns true for known SPA domains', () => {
    const html = 'x'.repeat(5000)
    expect(shouldUseDynamicScraping('https://nextjs.org/docs', html)).toBe(true)
    expect(shouldUseDynamicScraping('https://reactjs.org', html)).toBe(true)
  })

  it('returns true when React script is detected', () => {
    const html = `<html><body>${'x'.repeat(2000)}<script src="/react.min.js"></script></body></html>`
    expect(shouldUseDynamicScraping('https://example.com', html)).toBe(true)
  })

  it('returns true when root div is present', () => {
    const html = `<html><body><div id="root"></div></body></html>${'x'.repeat(500)}`
    expect(shouldUseDynamicScraping('https://example.com', html)).toBe(true)
  })

  it('returns true when loading indicators appear', () => {
    const html = `<html><body>${'x'.repeat(2000)}<div class="skeleton"></div></body></html>`
    expect(shouldUseDynamicScraping('https://example.com', html)).toBe(true)
  })
})
