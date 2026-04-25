import { describe, it, expect } from 'vitest'
import {
  extractMetadata,
  getBestTitle,
  getBestDescription,
  getBestImage,
} from '@/lib/utils/metadata-extractor'

describe('extractMetadata — basic meta tags', () => {
  it('extracts title from <title>', () => {
    const html = '<html><head><title>Hello World</title></head></html>'
    expect(extractMetadata(html).title).toBe('Hello World')
  })

  it('prefers og:title over <title>', () => {
    const html = `
      <html><head>
        <title>Plain Title</title>
        <meta property="og:title" content="OG Title">
      </head></html>`
    expect(extractMetadata(html).title).toBe('OG Title')
  })

  it('extracts meta description', () => {
    const html = `<meta name="description" content="A page about nothing.">`
    expect(extractMetadata(html).description).toBe('A page about nothing.')
  })

  it('prefers og:description over meta description', () => {
    const html = `
      <meta name="description" content="plain">
      <meta property="og:description" content="og">`
    expect(extractMetadata(html).description).toBe('og')
  })

  it('extracts keywords as a trimmed array', () => {
    const html = `<meta name="keywords" content="  one , two,three ">`
    expect(extractMetadata(html).keywords).toEqual(['one', 'two', 'three'])
  })

  it('returns undefined keywords when tag absent', () => {
    expect(extractMetadata('<html></html>').keywords).toBeUndefined()
  })
})

describe('extractMetadata — Open Graph tags', () => {
  const html = `
    <meta property="og:title" content="Title">
    <meta property="og:description" content="Desc">
    <meta property="og:image" content="https://example.com/img.png">
    <meta property="og:site_name" content="Example">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://example.com">`

  it('extracts all OG fields', () => {
    const meta = extractMetadata(html)
    expect(meta.ogTitle).toBe('Title')
    expect(meta.ogDescription).toBe('Desc')
    expect(meta.ogImage).toBe('https://example.com/img.png')
    expect(meta.ogSiteName).toBe('Example')
    expect(meta.ogType).toBe('article')
    expect(meta.ogUrl).toBe('https://example.com')
  })
})

describe('extractMetadata — Twitter Card tags', () => {
  const html = `
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="T">
    <meta name="twitter:description" content="D">
    <meta name="twitter:image" content="/twitter.png">
    <meta name="twitter:site" content="@site">
    <meta name="twitter:creator" content="@creator">`

  it('extracts all Twitter fields', () => {
    const meta = extractMetadata(html, 'https://example.com')
    expect(meta.twitterCard).toBe('summary_large_image')
    expect(meta.twitterTitle).toBe('T')
    expect(meta.twitterDescription).toBe('D')
    expect(meta.twitterImage).toBe('https://example.com/twitter.png')
    expect(meta.twitterSite).toBe('@site')
    expect(meta.twitterCreator).toBe('@creator')
  })
})

describe('extractMetadata — author', () => {
  it('finds author via meta[name="author"]', () => {
    expect(extractMetadata('<meta name="author" content="Alice">').author).toBe('Alice')
  })

  it('falls back to article:author', () => {
    expect(extractMetadata('<meta property="article:author" content="Bob">').author).toBe('Bob')
  })
})

describe('extractMetadata — favicon resolution', () => {
  it('extracts favicon from <link rel="icon">', () => {
    const html = '<link rel="icon" href="/fav.ico">'
    expect(extractMetadata(html, 'https://example.com').favicon).toBe('https://example.com/fav.ico')
  })

  it('falls back to /favicon.ico when no link tag', () => {
    expect(extractMetadata('<html></html>', 'https://example.com').favicon).toBe(
      'https://example.com/favicon.ico',
    )
  })

  it('returns undefined when no baseUrl + no link tag', () => {
    expect(extractMetadata('<html></html>').favicon).toBeUndefined()
  })
})

describe('extractMetadata — structured data (JSON-LD)', () => {
  it('parses a single JSON-LD block', () => {
    const html = `
      <script type="application/ld+json">
      {"@type": "Article", "headline": "Hi"}
      </script>`
    const meta = extractMetadata(html)
    expect(meta.structuredData).toHaveLength(1)
  })

  it('parses an array JSON-LD block into separate entries', () => {
    const html = `
      <script type="application/ld+json">
      [{"@type": "A"}, {"@type": "B"}]
      </script>`
    const meta = extractMetadata(html)
    expect(meta.structuredData).toHaveLength(2)
  })

  it('ignores malformed JSON-LD without throwing', () => {
    const html = `<script type="application/ld+json">{bad json}</script>`
    const meta = extractMetadata(html)
    expect(meta.structuredData).toEqual([])
  })
})

describe('extractMetadata — relative URL resolution', () => {
  it('resolves og:image relative path', () => {
    const html = `<meta property="og:image" content="/img.png">`
    expect(extractMetadata(html, 'https://example.com').ogImage).toBe('https://example.com/img.png')
  })

  it('leaves absolute URLs alone', () => {
    const html = `<meta property="og:image" content="https://cdn.example.com/img.png">`
    expect(extractMetadata(html, 'https://example.com').ogImage).toBe(
      'https://cdn.example.com/img.png',
    )
  })
})

describe('extractMetadata — canonical and timestamps', () => {
  it('extracts canonical URL', () => {
    const html = `<link rel="canonical" href="https://example.com/canonical">`
    expect(extractMetadata(html).canonicalUrl).toBe('https://example.com/canonical')
  })

  it('extracts published time', () => {
    const html = `<meta property="article:published_time" content="2026-01-01T00:00:00Z">`
    expect(extractMetadata(html).publishedTime).toBe('2026-01-01T00:00:00Z')
  })
})

describe('getBestTitle / getBestDescription / getBestImage', () => {
  it('getBestTitle prefers ogTitle', () => {
    expect(getBestTitle({ ogTitle: 'OG', title: 'Plain' })).toBe('OG')
    expect(getBestTitle({ title: 'Plain' })).toBe('Plain')
  })

  it('getBestDescription prefers ogDescription', () => {
    expect(getBestDescription({ ogDescription: 'OG', description: 'Plain' })).toBe('OG')
  })

  it('getBestImage prefers ogImage over twitterImage', () => {
    expect(getBestImage({ ogImage: 'og', twitterImage: 'tw' })).toBe('og')
    expect(getBestImage({ twitterImage: 'tw' })).toBe('tw')
  })
})
