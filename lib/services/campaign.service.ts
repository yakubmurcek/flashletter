import type { LandingPageData, CampaignConfig, Email } from '../types'

export class CampaignService {
  static async scrapeLandingPage(url: string): Promise<LandingPageData> {
    const response = await fetch('/api/scrape-landing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      throw new Error('Failed to scrape landing page')
    }

    const data = await response.json()
    return {
      url: data.url,
      content: data.content,
      metadata: data.metadata,
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

    if (!response.ok) {
      throw new Error('Failed to generate emails')
    }

    const data = await response.json()
    return data.emails.map((email: any, index: number) => ({
      id: index + 1,
      day: email.day || index + 1,
      subject: email.subject || `Email ${index + 1}`,
      preview: email.preview || email.subject || '',
      content: email.content || '',
    }))
  }
}
