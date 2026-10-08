import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { aiEmailsResponseSchema, generateEmailsRequestSchema } from '@/lib'
import {
  checkRateLimit,
  generateEmailsRateLimit,
  getRateLimitHeaders,
} from '@/lib/utils/rate-limit'
import { generateStructured, extractRateLimitInfo, isRateLimitError } from '@/lib/ai'
import { getClientIp } from '@/lib/utils/get-client-ip'
import { checkCampaignAllowed, checkEmailCount, getPlan } from '@/lib/billing/limits'
import { buildInstructions } from './prompts'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Require auth — rate-limit-by-IP alone is too easy to bypass and this
    // route spends AI credits on every call. Anonymous Supabase users
    // (signInAnonymously) are still accepted because they have a `user.id`.
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Now-redundant fallback to IP, kept as defense in depth in case auth
    // ever gets relaxed for a public-demo endpoint.
    const identifier = user.id || getClientIp(req)

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
    const { landingUrl, landingContent, landingAnalysis, config, campaignId } =
      generateEmailsRequestSchema.parse(body)

    // If the caller wants emails persisted, they must own the target campaign.
    // RLS would also block the underlying delete/insert, but checking here
    // turns a misconfigured RLS into an explicit 403 + avoids burning AI
    // tokens on a request that can't possibly persist.
    if (campaignId) {
      const ownershipService = new CampaignStorageService(supabase)
      const owned = await ownershipService.isOwnedBy(campaignId, user.id)
      if (!owned) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const plan = await getPlan(user)
    const denial =
      checkEmailCount(plan, config.days) ??
      (await checkCampaignAllowed(supabase, user.id, plan, campaignId))
    if (denial) {
      return NextResponse.json(denial, { status: 402 })
    }

    const instructions = buildInstructions(config, landingUrl, landingContent, landingAnalysis)

    const userInput = `Generate ${config.days} emails for this ${config.campaignType} campaign. Return only valid JSON.`

    const parsed = await generateStructured({
      system: instructions,
      messages: [{ role: 'user', content: userInput }],
      schema: aiEmailsResponseSchema,
    })

    // Normalize AI output (no id/uuid) into the full Email domain shape. Force
    // the day number from the index so a flaky model can't return duplicates
    // or out-of-range days that would clobber persistence.
    const emailsToSave = parsed.emails.slice(0, config.days).map((email, index) => {
      const day = index + 1
      return {
        id: day,
        uuid: null,
        day,
        subject: email.subject || '',
        preview: email.preview || '',
        content: email.content || '',
      }
    })

    // If campaignId is provided, attempt to save emails to database
    if (campaignId) {
      const supabase = await createClient()
      const campaignService = new CampaignStorageService(supabase)

      try {
        const savedEmails = await campaignService.saveEmails(campaignId, emailsToSave)
        return NextResponse.json(
          {
            emails: savedEmails,
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
            emails: emailsToSave,
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
        emails: emailsToSave,
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

    if (isRateLimitError(error)) {
      const rateLimitInfo = extractRateLimitInfo(error)

      // Report to Sentry as warning (expected but needs visibility)
      Sentry.captureException(error, {
        level: 'warning',
        tags: {
          error_type: 'ai_rate_limit',
          api_route: '/api/generate-emails',
        },
        extra: { rateLimitInfo },
      })

      return NextResponse.json(
        {
          error: 'AI rate limit exceeded',
          message: 'Too many requests to AI service. Please try again later.',
          rateLimitInfo,
        },
        { status: 429 },
      )
    }

    return NextResponse.json({ error: 'Failed to generate emails' }, { status: 500 })
  }
}
