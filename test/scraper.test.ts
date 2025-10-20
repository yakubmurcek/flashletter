import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractTextFromHTML, isContentMeaningful } from '@/lib/utils/scraper'
import {
  extractMetadata,
  getBestTitle,
  getBestDescription,
} from '@/lib/utils/metadata-extractor'
import { shouldUseDynamicScraping } from '@/lib/utils/playwright-scraper'

describe('Content Extraction', () => {
  it('should extract clean text from HTML', () => {
    const html = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <nav>Navigation</nav>
          <main>
            <h1>Main Title</h1>
            <p>This is the main content of the page.</p>
            <p>Another paragraph with more content.</p>
          </main>
          <footer>Footer content</footer>
        </body>
      </html>
    `

    const result = extractTextFromHTML(html)

    expect(result.content).toContain('Main Title')
    expect(result.content).toContain('This is the main content')
    expect(result.content).not.toContain('Navigation')
    expect(result.content).not.toContain('Footer content')
    expect(result.wordCount).toBeGreaterThan(0)
    expect(result.extractionMethod).toBe('static')
  })

  it('should remove script and style tags', () => {
    const html = `
      <html>
        <head>
          <style>body { color: red; }</style>
          <script>console.log('test');</script>
        </head>
        <body>
          <p>Content without scripts or styles</p>
        </body>
      </html>
    `

    const result = extractTextFromHTML(html)

    expect(result.content).toContain('Content without scripts or styles')
    expect(result.content).not.toContain('console.log')
    expect(result.content).not.toContain('color: red')
  })

  it('should prioritize main content areas', () => {
    const html = `
      <html>
        <body>
          <nav>Navigation</nav>
          <article>
            <h1>Article Title</h1>
            <p>Article content here.</p>
          </article>
          <aside>Sidebar content</aside>
        </body>
      </html>
    `

    const result = extractTextFromHTML(html)

    expect(result.content).toContain('Article Title')
    expect(result.content).toContain('Article content here')
    expect(result.content).not.toContain('Navigation')
    expect(result.content).not.toContain('Sidebar content')
  })

  it('should handle smart truncation', () => {
    const longContent = 'This is a sentence. '.repeat(1000)
    const html = `<html><body><p>${longContent}</p></body></html>`

    const result = extractTextFromHTML(html)

    expect(result.content.length).toBeLessThanOrEqual(10000)
    // Check if content is truncated (either ends with ... or is exactly at limit)
    expect(
      result.content.length < longContent.length ||
        result.content.endsWith('...')
    ).toBe(true)
  })

  it('should detect meaningful content', () => {
    const meaningfulContent =
      'This is a comprehensive article about web development and programming. It contains detailed information about HTML, CSS, and JavaScript technologies. The content provides valuable insights for developers and programmers. It has multiple paragraphs and meaningful text that would be useful for newsletter generation. This article covers various aspects of web development including frontend frameworks, backend technologies, and best practices. The information is well-structured and provides comprehensive details about modern web development techniques and methodologies.'
    const navContent = 'Home About Contact Login Signup Search Menu'

    expect(isContentMeaningful(meaningfulContent)).toBe(true)
    expect(isContentMeaningful(navContent)).toBe(false)
  })
})

describe('Metadata Extraction', () => {
  it('should extract basic metadata', () => {
    const html = `
      <html>
        <head>
          <title>Page Title</title>
          <meta name="description" content="Page description">
          <meta name="keywords" content="web, development, testing">
          <meta name="author" content="John Doe">
        </head>
        <body>Content</body>
      </html>
    `

    const metadata = extractMetadata(html)

    expect(metadata.title).toBe('Page Title')
    expect(metadata.description).toBe('Page description')
    expect(metadata.keywords).toEqual(['web', 'development', 'testing'])
    expect(metadata.author).toBe('John Doe')
  })

  it('should extract Open Graph metadata', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="OG Title">
          <meta property="og:description" content="OG Description">
          <meta property="og:image" content="https://example.com/image.jpg">
          <meta property="og:type" content="article">
        </head>
        <body>Content</body>
      </html>
    `

    const metadata = extractMetadata(html)

    expect(metadata.ogTitle).toBe('OG Title')
    expect(metadata.ogDescription).toBe('OG Description')
    expect(metadata.ogImage).toBe('https://example.com/image.jpg')
    expect(metadata.ogType).toBe('article')
  })

  it('should extract Twitter Card metadata', () => {
    const html = `
      <html>
        <head>
          <meta name="twitter:card" content="summary">
          <meta name="twitter:title" content="Twitter Title">
          <meta name="twitter:description" content="Twitter Description">
          <meta name="twitter:image" content="https://example.com/twitter.jpg">
        </head>
        <body>Content</body>
      </html>
    `

    const metadata = extractMetadata(html)

    expect(metadata.twitterCard).toBe('summary')
    expect(metadata.twitterTitle).toBe('Twitter Title')
    expect(metadata.twitterDescription).toBe('Twitter Description')
    expect(metadata.twitterImage).toBe('https://example.com/twitter.jpg')
  })

  it('should extract structured data', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": "Article Headline",
              "author": "Jane Doe"
            }
          </script>
        </head>
        <body>Content</body>
      </html>
    `

    const metadata = extractMetadata(html)

    expect(metadata.structuredData).toHaveLength(1)
    expect(metadata.structuredData?.[0]).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Article Headline',
      author: 'Jane Doe',
    })
  })

  it('should get best title and description', () => {
    const metadata = {
      title: 'Regular Title',
      description: 'Regular Description',
      ogTitle: 'OG Title',
      ogDescription: 'OG Description',
    }

    expect(getBestTitle(metadata)).toBe('OG Title')
    expect(getBestDescription(metadata)).toBe('OG Description')
  })
})

describe('Dynamic Scraping Detection', () => {
  it('should detect React applications', () => {
    const html = `
      <html>
        <head>
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>
    `

    expect(shouldUseDynamicScraping('https://example.com', html)).toBe(true)
  })

  it('should detect Vue applications', () => {
    const html = `
      <html>
        <head>
          <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
        </head>
        <body>
          <div id="app"></div>
        </body>
      </html>
    `

    expect(shouldUseDynamicScraping('https://example.com', html)).toBe(true)
  })

  it('should detect minimal content', () => {
    const html = '<html><body></body></html>'
    expect(shouldUseDynamicScraping('https://example.com', html)).toBe(true)
  })

  it('should not trigger for static content', () => {
    const html = `
      <html>
        <head>
          <title>Static Page - Comprehensive Guide</title>
          <meta name="description" content="A detailed guide with comprehensive information">
        </head>
        <body>
          <main>
            <h1>Welcome to our comprehensive guide</h1>
            <p>This is a static page with plenty of content and detailed information about various topics.</p>
            <p>It has multiple paragraphs and meaningful text that provides valuable insights for readers.</p>
            <p>No JavaScript frameworks are used here, just plain HTML and CSS for optimal performance.</p>
            <p>This content is substantial enough to be considered meaningful and informative.</p>
            <p>It contains detailed explanations and comprehensive information about the subject matter.</p>
            <p>Additional content to ensure the HTML is longer than 1000 characters and contains substantial information.</p>
            <p>More paragraphs with detailed explanations and comprehensive coverage of the topic.</p>
            <p>This ensures the content is rich and meaningful for newsletter generation purposes.</p>
            <p>Each paragraph adds value and provides readers with useful information and insights.</p>
            <p>The content is well-structured and follows best practices for web content creation.</p>
          </main>
        </body>
      </html>
    `

    expect(shouldUseDynamicScraping('https://example.com', html)).toBe(false)
  })

  it('should detect known SPA domains', () => {
    const html = '<html><body>Minimal content</body></html>'

    expect(shouldUseDynamicScraping('https://reactjs.org/docs', html)).toBe(
      true
    )
    expect(shouldUseDynamicScraping('https://vuejs.org/guide', html)).toBe(true)
    expect(shouldUseDynamicScraping('https://nextjs.org/docs', html)).toBe(true)
  })
})

// Note: Caching tests are skipped due to complex mocking requirements
// In a real implementation, these would be integration tests with a test Redis instance

describe('Error Handling', () => {
  it('should handle malformed HTML gracefully', () => {
    const malformedHtml = '<html><head><title>Test</title><body><p>Content</p>'

    expect(() => extractTextFromHTML(malformedHtml)).not.toThrow()
  })

  it('should handle empty HTML', () => {
    const result = extractTextFromHTML('')

    expect(result.content).toBe('')
    expect(result.wordCount).toBe(0)
  })

  it('should handle invalid JSON-LD gracefully', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            { invalid json }
          </script>
        </head>
        <body>Content</body>
      </html>
    `

    expect(() => extractMetadata(html)).not.toThrow()
  })
})
