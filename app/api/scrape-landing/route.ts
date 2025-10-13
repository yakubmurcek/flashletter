import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { LANDING_PAGE_CONTENT_LIMIT } from '@/lib/constants/app'

const scrapeLandingSchema = z.object({
  url: z.string().url(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url } = scrapeLandingSchema.parse(body)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsletterGenerator/1.0)',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }

    const html = await response.text()

    const textContent = extractTextFromHTML(html)
    const metadata = extractMetadata(html)

    return NextResponse.json({
      content: textContent,
      metadata,
      url,
    })
  } catch (error) {
    console.error('Scrape Landing API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to scrape landing page' },
      { status: 500 }
    )
  }
}

function extractTextFromHTML(html: string): string {
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text.substring(0, LANDING_PAGE_CONTENT_LIMIT)
}

function extractMetadata(html: string): Record<string, string> {
  const metadata: Record<string, string> = {}

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    metadata.title = titleMatch[1].trim()
  }

  const descMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
  )
  if (descMatch) {
    metadata.description = descMatch[1].trim()
  }

  const ogTitleMatch = html.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
  )
  if (ogTitleMatch) {
    metadata.ogTitle = ogTitleMatch[1].trim()
  }

  const ogDescMatch = html.match(
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
  )
  if (ogDescMatch) {
    metadata.ogDescription = ogDescMatch[1].trim()
  }

  return metadata
}
