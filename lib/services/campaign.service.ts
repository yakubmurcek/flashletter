import { emailsResponseSchema } from '../schemas'
import { scrapeLandingResponseSchema } from '../schemas/api'
import type { CampaignConfig, Email, LandingPageData } from '../types'

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

export class CampaignService {
  static async scrapeLandingPage(url: string): Promise<LandingPageData> {
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
      throw new Error('Invalid response from scrape endpoint')
    }

    const { url, content, metadata } = parsed.data

    const normalizedMetadata: LandingPageData['metadata'] = metadata
      ? {
          title: metadata.title,
          description: metadata.description,
          ogTitle: metadata.ogTitle,
          ogDescription: metadata.ogDescription,
        }
      : undefined

    return {
      url,
      content,
      metadata: normalizedMetadata,
    }
  }

  static async generateEmails(
    landingUrl: string,
    landingContent: string,
    config: CampaignConfig,
    campaignId?: string,
    signal?: AbortSignal
  ): Promise<Email[]> {
    const response = await fetch('/api/generate-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landingUrl,
        landingContent,
        config,
        campaignId,
      }),
      signal,
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(raw, 'Failed to generate emails')
      )
    }

    const { emails } = emailsResponseSchema.parse(raw)

    const normalizedEmails = emails.map((email) => ({
      ...email,
      preview: email.preview || email.subject || '',
      id: email.id,
      day: email.day,
    })) satisfies Email[]

    return normalizedEmails
  }
}
