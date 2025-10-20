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
import {
  retryWithBackoff,
  extractRateLimitInfo,
} from '@/lib/utils/openai-retry'
import { getClientIp } from '@/lib/utils/get-client-ip'

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
    const rateLimitResult = await checkRateLimit(
      generateEmailsRateLimit,
      identifier
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message:
            'Email generation rate limit exceeded. Please try again later.',
        },
        {
          status: 429,
          headers: getRateLimitHeaders(
            rateLimitResult.limit,
            rateLimitResult.remaining,
            rateLimitResult.reset
          ),
        }
      )
    }

    const body = await req.json()
    const { landingUrl, landingContent, config, campaignId } =
      generateEmailsRequestSchema.parse(body)

    const instructions = `You are an expert email marketing copywriter. Generate a ${
      config.days
    }-day ${config.campaignType} email campaign with a ${config.tone} tone.

Landing Page URL: ${landingUrl}
${
  landingContent
    ? `Landing Page Content:\n${landingContent.substring(0, 2000)}`
    : ''
}

For each email, provide:
1. A compelling subject line (under 60 characters)
2. Preview text (under 100 characters)
3. Email body content in Markdown format

Email campaign structure for ${config.campaignType}:
${getCampaignStructure(config.campaignType, config.days)}

Tone guidelines for ${config.tone}:
${getToneGuidelines(config.tone)}

IMPORTANT: Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "emails": [
    {
      "day": 1,
      "subject": "...",
      "preview": "...",
      "content": "..."
    }
  ]
}

Make sure the content is engaging, actionable, and aligned with best email marketing practices.`

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
      })
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
        const savedEmails = await campaignService.saveEmails(
          campaignId,
          emailsToSave
        )
        return NextResponse.json(
          {
            emails: savedEmails,
            usage: response.usage,
          },
          {
            headers: getRateLimitHeaders(
              rateLimitResult.limit,
              rateLimitResult.remaining,
              rateLimitResult.reset
            ),
          }
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
              rateLimitResult.reset
            ),
          }
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
          rateLimitResult.reset
        ),
      }
    )
  } catch (error) {
    console.error('Generate Emails API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    // Handle OpenAI rate limit errors
    if (error && typeof error === 'object' && 'status' in error) {
      if (error.status === 429) {
        const rateLimitInfo = extractRateLimitInfo(error)
        return NextResponse.json(
          {
            error: 'OpenAI rate limit exceeded',
            message: 'Too many requests to AI service. Please try again later.',
            rateLimitInfo,
          },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate emails' },
      { status: 500 }
    )
  }
}

function getCampaignStructure(type: string, days: number): string {
  const structures: Record<string, string> = {
    nurture: `
Day 1: Welcome & Introduction
Days 2-${Math.floor(days / 2)}: Value-building content, educational resources
Days ${Math.floor(days / 2) + 1}-${days - 1}: Social proof, success stories
Day ${days}: Strong call-to-action`,

    onboarding: `
Day 1: Warm welcome, set expectations
Days 2-${Math.floor(days / 3)}: Getting started guide, basic features
Days ${Math.floor(days / 3) + 1}-${Math.floor(
      (2 * days) / 3
    )}: Advanced features, pro tips
Days ${
      Math.floor((2 * days) / 3) + 1
    }-${days}: Completion celebration, next steps`,

    promotional: `
Day 1: Introduce offer, create awareness
Days 2-${Math.floor(days / 2)}: Build urgency, showcase benefits
Days ${Math.floor(days / 2) + 1}-${days - 1}: Overcome objections, testimonials
Day ${days}: Final push, last chance messaging`,
  }

  return structures[type] || structures.nurture
}

function getToneGuidelines(tone: string): string {
  const tones: Record<string, string> = {
    professional:
      'Formal language, clear and direct, industry expertise, authoritative',
    friendly:
      'Conversational, warm, approachable, use "you" and "we", casual but respectful',
    enthusiastic:
      'Energetic, exciting, use exclamation points (moderately), positive language',
    casual: 'Relaxed, informal, conversational, relatable, down-to-earth',
  }

  return tones[tone] || tones.friendly
}
