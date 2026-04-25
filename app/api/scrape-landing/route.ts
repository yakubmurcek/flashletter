import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { scrapeLandingRequestSchema, scrapeLandingResponseSchema } from '@/lib/schemas/api'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, scrapeLandingRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
import { getClientIp } from '@/lib/utils/get-client-ip'
import { getCachedScrapeData, setCachedScrapeData } from '@/lib/utils/scraper-cache'
import { extractTextFromHTML } from '@/lib/utils/scraper'
import { extractMetadata, type ExtractedMetadata } from '@/lib/utils/metadata-extractor'
import { scrapeWithPlaywright, shouldUseDynamicScraping } from '@/lib/utils/playwright-scraper'

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Get user ID for rate limiting
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Use user ID or IP address as identifier
    const identifier = user?.id || getClientIp(req)

    // Check rate limit
    const rateLimitResult = await checkRateLimit(scrapeLandingRateLimit, identifier)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Landing page scraping rate limit exceeded. Please try again later.',
        },
        {
          status: 429,
          headers: getRateLimitHeaders(
            rateLimitResult.limit,
            rateLimitResult.remaining,
            rateLimitResult.reset,
          ),
        },
      )
    }

    // Parse request body
    const body = await req.json()
    const { url, useDynamic = false } = scrapeLandingRequestSchema.parse(body)

    // Check cache first
    const cacheResult = await getCachedScrapeData(url)
    if (cacheResult.fromCache && cacheResult.data) {
      const response = {
        content: cacheResult.data.content,
        metadata: cacheResult.data.metadata,
        url: cacheResult.data.url,
        stats: {
          wordCount: cacheResult.data.wordCount,
          extractionMethod: cacheResult.data.extractionMethod,
          cached: true,
        },
      }

      return NextResponse.json(response, {
        headers: {
          ...getRateLimitHeaders(
            rateLimitResult.limit,
            rateLimitResult.remaining,
            rateLimitResult.reset,
          ),
          'X-Cache-Status': 'HIT',
          'X-Cache-TTL': cacheResult.ttl?.toString() || '0',
        },
      })
    }

    // Perform scraping
    let scrapeResult: {
      content: string
      metadata: ExtractedMetadata
      wordCount: number
      extractionMethod: 'static' | 'dynamic'
      finalUrl?: string
      loadTime?: number
    }

    if (useDynamic) {
      // Use Playwright for dynamic scraping
      try {
        const playwrightResult = await scrapeWithPlaywright(url)
        scrapeResult = {
          content: playwrightResult.content,
          metadata: playwrightResult.metadata,
          wordCount: playwrightResult.wordCount,
          extractionMethod: 'dynamic',
          finalUrl: playwrightResult.finalUrl,
          loadTime: playwrightResult.loadTime,
        }
      } catch (playwrightError) {
        console.warn(
          `Forced dynamic scraping failed for ${url}, falling back to static:`,
          playwrightError,
        )
        // Fallback to static scraping if forced dynamic fails
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsletterGenerator/1.0)',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
        }

        const html = await response.text()
        const finalUrl = response.url
        const scrapedContent = extractTextFromHTML(html)
        const metadata = extractMetadata(html, finalUrl)

        scrapeResult = {
          content: scrapedContent.content,
          metadata,
          wordCount: scrapedContent.wordCount,
          extractionMethod: 'static',
          finalUrl,
        }
      }
    } else {
      // Try static scraping first
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsletterGenerator/1.0)',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()
      const finalUrl = response.url

      // Check if we should use dynamic scraping instead
      if (shouldUseDynamicScraping(url, html)) {
        console.log(`Switching to dynamic scraping for ${url}`)
        try {
          const playwrightResult = await scrapeWithPlaywright(url)
          scrapeResult = {
            content: playwrightResult.content,
            metadata: playwrightResult.metadata,
            wordCount: playwrightResult.wordCount,
            extractionMethod: 'dynamic',
            finalUrl: playwrightResult.finalUrl,
            loadTime: playwrightResult.loadTime,
          }
        } catch (playwrightError) {
          console.warn(
            `Dynamic scraping failed for ${url}, falling back to static:`,
            playwrightError,
          )
          // Fallback to static scraping if Playwright fails
          const scrapedContent = extractTextFromHTML(html)
          const metadata = extractMetadata(html, finalUrl)

          scrapeResult = {
            content: scrapedContent.content,
            metadata,
            wordCount: scrapedContent.wordCount,
            extractionMethod: 'static',
            finalUrl,
          }
        }
      } else {
        // Use static scraping
        const scrapedContent = extractTextFromHTML(html)
        const metadata = extractMetadata(html, finalUrl)

        scrapeResult = {
          content: scrapedContent.content,
          metadata,
          wordCount: scrapedContent.wordCount,
          extractionMethod: 'static',
          finalUrl,
        }
      }
    }

    // Cache the result
    await setCachedScrapeData(url, {
      content: scrapeResult.content,
      metadata: scrapeResult.metadata,
      url: scrapeResult.finalUrl || url,
      wordCount: scrapeResult.wordCount,
      extractionMethod: scrapeResult.extractionMethod,
    })

    // Build response
    const response = {
      content: scrapeResult.content,
      metadata: scrapeResult.metadata,
      url: scrapeResult.finalUrl || url,
      stats: {
        wordCount: scrapeResult.wordCount,
        extractionMethod: scrapeResult.extractionMethod,
        cached: false,
        loadTime: scrapeResult.loadTime,
        finalUrl: scrapeResult.finalUrl,
      },
    }

    // Validate response against schema
    const validatedResponse = scrapeLandingResponseSchema.parse(response)

    const totalTime = Date.now() - startTime

    return NextResponse.json(validatedResponse, {
      headers: {
        ...getRateLimitHeaders(
          rateLimitResult.limit,
          rateLimitResult.remaining,
          rateLimitResult.reset,
        ),
        'X-Cache-Status': 'MISS',
        'X-Processing-Time': totalTime.toString(),
        'X-Extraction-Method': scrapeResult.extractionMethod,
      },
    })
  } catch (error) {
    console.error('Scrape Landing API Error:', error)

    // Report to Sentry
    Sentry.captureException(error, {
      tags: { api_route: '/api/scrape-landing' },
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 },
      )
    }

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        return NextResponse.json(
          { error: 'Failed to fetch URL', message: error.message },
          { status: 400 },
        )
      }

      if (error.message.includes('Dynamic scraping failed')) {
        return NextResponse.json(
          { error: 'Dynamic scraping failed', message: error.message },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ error: 'Failed to scrape landing page' }, { status: 500 })
  }
}
