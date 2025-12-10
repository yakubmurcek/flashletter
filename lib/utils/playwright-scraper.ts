import { chromium as playwrightChromium, type Browser, type Page } from 'playwright-core'
import { PLAYWRIGHT_TIMEOUT } from '@/lib/constants/app'
import { extractTextFromHTML, type ScrapedContent } from './scraper'
import { extractMetadata, type ExtractedMetadata } from './metadata-extractor'

// Only import @sparticuz/chromium in production/serverless environments
let chromium: any = null
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  try {
    chromium = require('@sparticuz/chromium')
  } catch (error) {
    console.warn('@sparticuz/chromium not available, using system browser')
  }
}

/**
 * Playwright-based dynamic content scraping
 * Handles JavaScript-heavy sites that require browser rendering
 */

export interface PlaywrightScrapeResult {
  content: string
  metadata: ExtractedMetadata
  wordCount: number
  extractionMethod: 'dynamic'
  loadTime: number
  finalUrl: string
}

/**
 * Scrape a URL using Playwright for dynamic content
 * @param url URL to scrape
 * @param options Scraping options
 * @returns Scraped content and metadata
 */
export async function scrapeWithPlaywright(
  url: string,
  options: {
    timeout?: number
    waitFor?: 'load' | 'domcontentloaded' | 'networkidle'
    userAgent?: string
    viewport?: { width: number; height: number }
  } = {},
): Promise<PlaywrightScrapeResult> {
  // Check if Playwright should be enabled in development
  // Set ENABLE_PLAYWRIGHT_DEV=false in .env.local to disable for testing
  const isDevMode = process.env.NODE_ENV === 'development'
  const isPlaywrightDisabledInDev = process.env.ENABLE_PLAYWRIGHT_DEV === 'false'

  if (isDevMode && isPlaywrightDisabledInDev) {
    throw new Error(
      'Playwright is disabled in development mode. Remove ENABLE_PLAYWRIGHT_DEV=false from .env.local to enable it.',
    )
  }

  const startTime = Date.now()
  const timeout = options.timeout || PLAYWRIGHT_TIMEOUT
  const waitFor = options.waitFor || 'networkidle'
  const userAgent = options.userAgent || 'Mozilla/5.0 (compatible; NewsletterGenerator/1.0)'
  const viewport = options.viewport || { width: 1280, height: 720 }

  let browser: Browser | null = null
  let page: Page | null = null

  try {
    // Configure browser launch options based on environment
    let launchOptions: any = {
      headless: true,
    }

    if (chromium && (process.env.NODE_ENV === 'production' || process.env.VERCEL)) {
      // Production/serverless environment - use @sparticuz/chromium
      const browserArgs = [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ]

      launchOptions.args = browserArgs

      // Try to get executable path
      try {
        launchOptions.executablePath = await chromium.executablePath()
      } catch (error) {
        console.warn('Failed to get Chromium executable path, using system browser:', error)
      }
    } else {
      // Development environment - use system Playwright browser
      launchOptions.args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ]
    }

    browser = await playwrightChromium.launch(launchOptions)

    // Create new page
    page = await browser.newPage({
      userAgent,
      viewport,
    })

    // Set timeout
    page.setDefaultTimeout(timeout)

    // Navigate to URL
    const response = await page.goto(url, {
      waitUntil: waitFor,
      timeout,
    })

    if (!response || !response.ok()) {
      throw new Error(`Failed to load page: ${response?.status()} ${response?.statusText()}`)
    }

    // Wait for additional content to load
    await waitForContent(page)

    // Get final URL (in case of redirects)
    const finalUrl = page.url()

    // Extract HTML content
    const html = await page.content()

    // Extract text content using our cheerio-based scraper
    const scrapedContent = extractTextFromHTML(html)

    // Extract metadata
    const metadata = extractMetadata(html, finalUrl)

    const loadTime = Date.now() - startTime

    return {
      content: scrapedContent.content,
      metadata,
      wordCount: scrapedContent.wordCount,
      extractionMethod: 'dynamic',
      loadTime,
      finalUrl,
    }
  } catch (error) {
    console.error('Playwright scraping failed:', error)
    throw new Error(
      `Dynamic scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  } finally {
    // Clean up resources
    if (page) {
      await page.close().catch(() => {})
    }
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}

/**
 * Wait for content to load on the page
 * @param page Playwright page instance
 */
async function waitForContent(page: Page): Promise<void> {
  try {
    // Wait for common content indicators
    await Promise.race([
      page.waitForSelector('main, article, .content, .main-content', {
        timeout: 5000,
      }),
      page.waitForSelector('body', { timeout: 5000 }),
    ])
  } catch (error) {
    // Ignore timeout errors, continue with whatever content is available
    console.warn('Content wait timeout, proceeding with available content')
  }

  // Wait a bit more for any lazy-loaded content
  await page.waitForTimeout(1000)

  // Wait for images to load (optional)
  try {
    await page.waitForLoadState('networkidle', { timeout: 3000 })
  } catch (error) {
    // Ignore timeout, continue
  }
}

/**
 * Check if a URL likely needs dynamic scraping
 * @param url URL to check
 * @param initialHtml Initial HTML from static fetch
 * @returns true if dynamic scraping is recommended
 */
export function shouldUseDynamicScraping(url: string, initialHtml: string): boolean {
  // Check for common indicators that suggest dynamic content
  const dynamicIndicators = [
    // Framework indicators
    /<script[^>]*src[^>]*react/i,
    /<script[^>]*src[^>]*vue/i,
    /<script[^>]*src[^>]*angular/i,
    /<script[^>]*src[^>]*next/i,
    /<script[^>]*src[^>]*nuxt/i,

    // SPA indicators
    /<div[^>]*id=["']app["']/i,
    /<div[^>]*id=["']root["']/i,
    /<div[^>]*id=["']main["']/i,

    // Loading indicators
    /loading/i,
    /spinner/i,
    /skeleton/i,

    // Minimal content indicators
    /<body[^>]*><\/body>/i,
    /<main[^>]*><\/main>/i,
    /<article[^>]*><\/article>/i,
  ]

  // Check if HTML is mostly empty or contains loading indicators
  const hasMinimalContent = initialHtml.length < 1000
  const hasDynamicIndicators = dynamicIndicators.some((pattern) => pattern.test(initialHtml))

  // Check for specific domains that commonly use SPAs
  const spaDomains = [
    'reactjs.org',
    'vuejs.org',
    'angular.io',
    'nextjs.org',
    'nuxtjs.org',
    'svelte.dev',
  ]

  const isKnownSPA = spaDomains.some((domain) => url.includes(domain))

  return hasMinimalContent || hasDynamicIndicators || isKnownSPA
}

/**
 * Scrape with fallback strategy
 * Try static scraping first, fall back to Playwright if needed
 * @param url URL to scrape
 * @param staticHtml HTML from static fetch
 * @param options Playwright options
 * @returns Scraped content
 */
export async function scrapeWithFallback(
  url: string,
  staticHtml: string,
  options: {
    forceDynamic?: boolean
    timeout?: number
    waitFor?: 'load' | 'domcontentloaded' | 'networkidle'
  } = {},
): Promise<PlaywrightScrapeResult> {
  const { forceDynamic = false, ...playwrightOptions } = options

  // If forced to use dynamic scraping, skip static analysis
  if (forceDynamic) {
    return await scrapeWithPlaywright(url, playwrightOptions)
  }

  // Check if dynamic scraping is recommended
  if (shouldUseDynamicScraping(url, staticHtml)) {
    console.log(`Using dynamic scraping for ${url} (detected SPA or minimal content)`)
    return await scrapeWithPlaywright(url, playwrightOptions)
  }

  // For static content, we should use the static scraper instead
  // This function is specifically for dynamic scraping
  throw new Error('Static scraping should be used for this URL')
}

/**
 * Get browser info for debugging
 */
export async function getBrowserInfo(): Promise<{
  userAgent: string
  viewport: { width: number; height: number }
  chromiumVersion: string
}> {
  let browser: Browser | null = null

  try {
    // Use same launch options as main scraping function
    let launchOptions: any = {
      headless: true,
    }

    if (chromium && (process.env.NODE_ENV === 'production' || process.env.VERCEL)) {
      launchOptions.args = chromium.args
      try {
        launchOptions.executablePath = await chromium.executablePath()
      } catch (error) {
        console.warn('Failed to get Chromium executable path for browser info')
      }
    } else {
      launchOptions.args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ]
    }

    browser = await playwrightChromium.launch(launchOptions)

    const page = await browser.newPage()
    const userAgent = await page.evaluate(() => navigator.userAgent)
    const viewport = page.viewportSize() || { width: 1280, height: 720 }

    await page.close()

    return {
      userAgent,
      viewport,
      chromiumVersion: chromium ? '141.0.0' : 'system', // @sparticuz/chromium version or system
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}
