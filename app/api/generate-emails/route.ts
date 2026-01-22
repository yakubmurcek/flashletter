import * as Sentry from '@sentry/nextjs'
import { openai } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { zodTextFormat } from 'openai/helpers/zod'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { emailsResponseSchema, generateEmailsRequestSchema } from '@/lib'
import {
  checkRateLimit,
  generateEmailsRateLimit,
  getRateLimitHeaders,
} from '@/lib/utils/rate-limit'
import { retryWithBackoff, extractRateLimitInfo } from '@/lib/utils/openai-retry'
import { getClientIp } from '@/lib/utils/get-client-ip'
import { buildInstructions } from './prompts'

export async function POST(req: NextRequest) {
  try {
    // Get user ID for rate limiting
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Use user ID or IP address as identifier
    const identifier = user?.id || getClientIp(req)

    // Check rate limit
    const rateLimitResult = await checkRateLimit(generateEmailsRateLimit, identifier)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Email generation rate limit exceeded. Please try again later.',
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

    const body = await req.json()
    const { landingUrl, landingContent, config, campaignId } =
      generateEmailsRequestSchema.parse(body)

    const instructions = buildInstructions(config, landingUrl, landingContent)

    const userInput = `Generate ${config.days} emails for this ${config.campaignType} campaign. Return only valid JSON.`

    // Wrap OpenAI call with retry logic
    const response = await retryWithBackoff(() =>
      openai.responses.parse({
        model: 'gpt-4o',
        input: [
          { role: 'system', content: instructions },
          { role: 'user', content: userInput },
        ],
        temperature: 0.75,
        text: {
          format: zodTextFormat(emailsResponseSchema, 'emails_response'),
        },
      }),
    )

    const parsed = response.output_parsed
    if (!parsed) {
      throw new Error('No response from OpenAI')
    }

    const emailsArray = parsed.emails

    // If campaignId is provided, attempt to save emails to database
    if (campaignId) {
      const supabase = await createClient()
      const campaignService = new CampaignStorageService(supabase)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailsToSave = emailsArray.map((email: any, index: number) => ({
        id: email.day || index + 1,
        uuid: email.uuid || null,
        day: email.day || index + 1,
        subject: email.subject || '',
        preview: email.preview || '',
        content: email.content || '',
      }))

      try {
        const savedEmails = await campaignService.saveEmails(campaignId, emailsToSave)
        return NextResponse.json(
          {
            emails: savedEmails,
            usage: response.usage,
          },
          {
            headers: getRateLimitHeaders(
              rateLimitResult.limit,
              rateLimitResult.remaining,
              rateLimitResult.reset,
            ),
          },
        )
      } catch (saveError) {
        console.error('Failed to save emails to Supabase:', saveError)
        // Fall back to returning unsaved emails so the user can proceed
        return NextResponse.json(
          {
            emails: emailsArray,
            usage: response.usage,
            warning: 'Could not save emails; returned without persistence',
          },
          {
            headers: getRateLimitHeaders(
              rateLimitResult.limit,
              rateLimitResult.remaining,
              rateLimitResult.reset,
            ),
          },
        )
      }
    }

    return NextResponse.json(
      {
        emails: emailsArray,
        usage: response.usage,
      },
      {
        headers: getRateLimitHeaders(
          rateLimitResult.limit,
          rateLimitResult.remaining,
          rateLimitResult.reset,
        ),
      },
    )
  } catch (error) {
    console.error('Generate Emails API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 },
      )
    }

    // Handle OpenAI rate limit errors
    if (error && typeof error === 'object' && 'status' in error) {
      if (error.status === 429) {
        const rateLimitInfo = extractRateLimitInfo(error)

        // Report to Sentry as warning (expected but needs visibility)
        Sentry.captureException(error, {
          level: 'warning',
          tags: {
            error_type: 'openai_rate_limit',
            api_route: '/api/generate-emails',
          },
          extra: { rateLimitInfo },
        })

        return NextResponse.json(
          {
            error: 'OpenAI rate limit exceeded',
            message: 'Too many requests to AI service. Please try again later.',
            rateLimitInfo,
          },
          { status: 429 },
        )
      }
    }

    return NextResponse.json({ error: 'Failed to generate emails' }, { status: 500 })
  }
}
