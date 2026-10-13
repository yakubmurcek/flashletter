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
import {
  assertSafeUrl,
  isUnsafeUrlError,
  userMessageForUnsafeUrl,
  safeFetch,
} from '@/lib/utils/url-safety'
import { analyzeLandingPage } from '@/lib/utils/analyzer'
import type { LandingPageAnalysis } from '@/lib/schemas/analysis'
import type { ScrapeStreamEvent } from '@/lib/types/scrape-progress'
import {
  UpstreamStatusError,
  userMessageForScrapeError,
} from '@/app/api/scrape-landing/scrape-error-message'

function cleanDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'page'
  }
}

export async function POST(req: NextRequest) {
  // Rate limit + request parsing outside the stream so we can return a clean 4xx/JSON response.
  let parsedBody: z.infer<typeof scrapeLandingRequestSchema>
  try {
    const body = await req.json()
    parsedBody = scrapeLandingRequestSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    await assertSafeUrl(parsedBody.url)
  } catch (error) {
    if (isUnsafeUrlError(error)) {
      return NextResponse.json({ error: userMessageForUnsafeUrl(error) }, { status: 400 })
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Require auth. Anonymous Supabase users (signInAnonymously) still pass.
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const identifier = user.id || getClientIp(req)
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

  const { url, useDynamic = false } = parsedBody
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ScrapeStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      try {
        send({ type: 'stage', stageId: 'connecting', context: { domain: cleanDomain(url) } })

        const cacheResult = await getCachedScrapeData(url)

        let content: string
        let metadata: ExtractedMetadata
        let wordCount: number
        let extractionMethod: 'static' | 'dynamic'
        let finalUrl: string
        let loadTime: number | undefined
        let cached = false

        if (cacheResult.fromCache && cacheResult.data) {
          cached = true
          content = cacheResult.data.content
          metadata = cacheResult.data.metadata
          wordCount = cacheResult.data.wordCount
          extractionMethod = cacheResult.data.extractionMethod
          finalUrl = cacheResult.data.url

          send({
            type: 'stage',
            stageId: 'extracting',
            context: {
              title: metadata.ogTitle || metadata.title,
              siteName: metadata.ogSiteName,
              cached: true,
            },
          })
        } else {
          send({ type: 'stage', stageId: 'fetching' })

          if (useDynamic) {
            const result = await scrapeWithPlaywright(url)
            content = result.content
            metadata = result.metadata
            wordCount = result.wordCount
            extractionMethod = 'dynamic'
            finalUrl = result.finalUrl
            loadTime = result.loadTime
          } else {
            const response = await safeFetch(url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsletterGenerator/1.0)' },
            })

            if (!response.ok) {
              throw new UpstreamStatusError(response.status, response.statusText)
            }

            const html = response.text
            const fetchedUrl = response.finalUrl

            if (shouldUseDynamicScraping(url, html)) {
              try {
                const result = await scrapeWithPlaywright(url)
                content = result.content
                metadata = result.metadata
                wordCount = result.wordCount
                extractionMethod = 'dynamic'
                finalUrl = result.finalUrl
                loadTime = result.loadTime
              } catch (playwrightError) {
                console.warn(
                  `Dynamic scraping failed for ${url}, falling back to static:`,
                  playwrightError,
                )
                const scraped = extractTextFromHTML(html)
                metadata = extractMetadata(html, fetchedUrl)
                content = scraped.content
                wordCount = scraped.wordCount
                extractionMethod = 'static'
                finalUrl = fetchedUrl
              }
            } else {
              const scraped = extractTextFromHTML(html)
              metadata = extractMetadata(html, fetchedUrl)
              content = scraped.content
              wordCount = scraped.wordCount
              extractionMethod = 'static'
              finalUrl = fetchedUrl
            }
          }

          send({
            type: 'stage',
            stageId: 'extracting',
            context: {
              title: metadata.ogTitle || metadata.title,
              siteName: metadata.ogSiteName,
            },
          })

          await setCachedScrapeData(url, {
            content,
            metadata,
            url: finalUrl,
            wordCount,
            extractionMethod,
          })
        }

        send({
          type: 'stage',
          stageId: 'analyzing',
          context: {
            title: metadata.ogTitle || metadata.title,
            siteName: metadata.ogSiteName,
          },
        })

        let analysis: LandingPageAnalysis | undefined
        try {
          analysis = await analyzeLandingPage({ url: finalUrl, content, metadata })
        } catch (analysisError) {
          console.error('Landing page analysis failed:', analysisError)
          Sentry.captureException(analysisError, {
            tags: { api_route: '/api/scrape-landing/stream', stage: 'analysis' },
          })
        }

        send({ type: 'stage', stageId: 'synthesizing' })

        const responsePayload = {
          content,
          metadata,
          url: finalUrl,
          stats: {
            wordCount,
            extractionMethod,
            cached,
            loadTime,
            finalUrl,
          },
          analysis,
        }

        const validated = scrapeLandingResponseSchema.parse(responsePayload)

        send({ type: 'complete', data: validated })
      } catch (error) {
        console.error('Scrape Landing Stream Error:', error)
        Sentry.captureException(error, {
          tags: { api_route: '/api/scrape-landing/stream' },
        })

        send({ type: 'error', message: userMessageForScrapeError(error) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
      ...getRateLimitHeaders(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset,
      ),
    },
  })
}
