import { generateEmailsResponseSchema, scrapeLandingResponseSchema } from '../schemas/api'
import { emailSchema } from '../schemas'
import { z } from 'zod'
import type { CampaignConfig, Email, GenerateEmailsResponse, LandingPageData } from '../types'
import type { LandingPageAnalysis } from '../schemas/analysis'
import type { ScrapeStreamEvent } from '../types/scrape-progress'
import { planLimitFromResponse } from '../billing/errors'

const generateEmailsStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start'), total: z.number() }),
  z.object({ type: z.literal('email'), email: emailSchema }),
  z.object({
    type: z.literal('complete'),
    emails: z.array(emailSchema),
    warning: z.string().optional(),
  }),
  z.object({ type: z.literal('error'), message: z.string() }),
])

export type GenerateEmailsStreamEvent = z.infer<typeof generateEmailsStreamEventSchema>

/** Shown when the scrape response itself is broken; the raw cause means nothing to a visitor. */
const SCRAPE_BROKEN_MESSAGE = "We couldn't read that page. Please try again."

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (isRecord(payload)) {
    const { error, message } = payload
    if (typeof error === 'string' && error.trim()) {
      return error
    }
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

/** The server refused the request because the user is generating too fast. */
export class RateLimitedError extends Error {
  constructor() {
    super("You've started a lot of generations in a short time. Wait a minute and try again.")
    this.name = 'RateLimitedError'
  }
}

export const CampaignService = {
  async scrapeLandingPage(url: string): Promise<LandingPageData> {
    const response = await fetch('/api/scrape-landing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(extractErrorMessage(raw, 'Failed to scrape landing page'))
    }

    const parsed = scrapeLandingResponseSchema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(SCRAPE_BROKEN_MESSAGE)
    }

    const { url: scrapedUrl, content, metadata } = parsed.data

    const normalizedMetadata: LandingPageData['metadata'] = metadata
      ? {
          title: metadata.title,
          description: metadata.description,
          ogTitle: metadata.ogTitle,
          ogDescription: metadata.ogDescription,
          ogSiteName: metadata.ogSiteName,
          twitterTitle: metadata.twitterTitle,
        }
      : undefined

    return {
      url: scrapedUrl,
      content,
      metadata: normalizedMetadata,
    }
  },

  async scrapeLandingPageStream(
    url: string,
    onEvent: (event: ScrapeStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<LandingPageData> {
    const response = await fetch('/api/scrape-landing/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal,
    })

    if (!response.ok) {
      const raw = await response.json().catch(() => null)
      throw new Error(extractErrorMessage(raw, 'Failed to scrape landing page'))
    }

    if (!response.body) {
      throw new Error(SCRAPE_BROKEN_MESSAGE)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let completed: LandingPageData | null = null
    let streamError: string | null = null

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        for (
          let newlineIndex = buffer.indexOf('\n');
          newlineIndex !== -1;
          newlineIndex = buffer.indexOf('\n')
        ) {
          const line = buffer.slice(0, newlineIndex).trim()
          buffer = buffer.slice(newlineIndex + 1)
          if (!line) continue

          let event: ScrapeStreamEvent
          try {
            event = JSON.parse(line) as ScrapeStreamEvent
          } catch {
            continue
          }

          onEvent(event)

          if (event.type === 'complete') {
            const parsed = scrapeLandingResponseSchema.safeParse(event.data)
            if (!parsed.success) {
              streamError = 'Invalid response from scrape endpoint'
              continue
            }
            const { url: scrapedUrl, content, metadata, analysis } = parsed.data
            const normalizedMetadata: LandingPageData['metadata'] = metadata
              ? {
                  title: metadata.title,
                  description: metadata.description,
                  ogTitle: metadata.ogTitle,
                  ogDescription: metadata.ogDescription,
                  ogSiteName: metadata.ogSiteName,
                  twitterTitle: metadata.twitterTitle,
                }
              : undefined

            completed = {
              url: scrapedUrl,
              content,
              metadata: normalizedMetadata,
              analysis,
            }
          } else if (event.type === 'error') {
            streamError = event.message
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (streamError) {
      throw new Error(streamError)
    }
    if (!completed) {
      throw new Error(SCRAPE_BROKEN_MESSAGE)
    }
    return completed
  },

  async generateEmails(
    landingUrl: string,
    landingContent: string,
    config: CampaignConfig,
    campaignId?: string,
    signal?: AbortSignal,
    landingAnalysis?: LandingPageAnalysis,
  ): Promise<GenerateEmailsResponse> {
    const response = await fetch('/api/generate-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landingUrl,
        landingContent,
        landingAnalysis,
        config,
        campaignId,
      }),
      signal,
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(extractErrorMessage(raw, 'Failed to generate emails'))
    }

    const parsed = generateEmailsResponseSchema.parse(raw)

    const normalizedEmails = parsed.emails.map((email) => ({
      ...email,
      preview: email.preview || email.subject || '',
      id: email.id,
      day: email.day,
    })) satisfies Email[]

    return {
      emails: normalizedEmails,
      warning: parsed.warning,
      usage: parsed.usage,
    }
  },

  async generateEmailsStream(
    landingUrl: string,
    landingContent: string,
    config: CampaignConfig,
    onEvent: (event: GenerateEmailsStreamEvent) => void,
    options?: {
      campaignId?: string
      signal?: AbortSignal
      landingAnalysis?: LandingPageAnalysis
    },
  ): Promise<Email[]> {
    const response = await fetch('/api/generate-emails/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landingUrl,
        landingContent,
        landingAnalysis: options?.landingAnalysis,
        config,
        campaignId: options?.campaignId,
      }),
      signal: options?.signal,
    })

    if (!response.ok) {
      const raw = await response.json().catch(() => null)
      if (response.status === 429) throw new RateLimitedError()
      throw (
        planLimitFromResponse(response.status, raw) ??
        new Error(extractErrorMessage(raw, 'Failed to generate emails'))
      )
    }
    if (!response.body) {
      throw new Error('Stream not supported in this environment')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let completedEmails: Email[] | null = null
    let streamError: string | null = null

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        for (
          let newlineIndex = buffer.indexOf('\n');
          newlineIndex !== -1;
          newlineIndex = buffer.indexOf('\n')
        ) {
          const line = buffer.slice(0, newlineIndex).trim()
          buffer = buffer.slice(newlineIndex + 1)
          if (!line) continue

          let raw: unknown
          try {
            raw = JSON.parse(line)
          } catch {
            // Malformed JSON line — skip and keep reading the stream.
            continue
          }

          const parsed = generateEmailsStreamEventSchema.safeParse(raw)
          if (!parsed.success) {
            continue
          }

          onEvent(parsed.data)

          if (parsed.data.type === 'complete') {
            completedEmails = parsed.data.emails
          } else if (parsed.data.type === 'error') {
            streamError = parsed.data.message
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (streamError) {
      throw new Error(streamError)
    }
    if (!completedEmails) {
      throw new Error('Stream closed before completion')
    }
    return completedEmails
  },
}
