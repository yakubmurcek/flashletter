import * as Sentry from '@sentry/nextjs'
import { openai } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requestSchema } from './schemas'
import { buildSystemInstructions } from './prompt-builder'
import { parseOpenAIResponse } from './response-handler'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, chatRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
import { retryWithBackoff, extractRateLimitInfo } from '@/lib/utils/openai-retry'
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
    const rateLimitResult = await checkRateLimit(chatRateLimit, identifier)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Please wait before making another request.',
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
    const { messages, campaignContext, emailContext, selectedContext } = requestSchema.parse(body)

    const instructions = buildSystemInstructions(campaignContext, emailContext, selectedContext)

    const userInput = messages[messages.length - 1]?.content || ''

    // Wrap OpenAI call with retry logic
    const response = await retryWithBackoff(() =>
      openai.responses.create({
        model: 'gpt-5-mini',
        instructions,
        input: userInput,
        // Note: GPT-5 family does not accept `temperature` on responses.create.
        max_output_tokens: 2000,
      }),
    )

    const parsedResponse = parseOpenAIResponse(response)

    return NextResponse.json(parsedResponse, {
      headers: getRateLimitHeaders(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset,
      ),
    })
  } catch (error) {
    console.error('Chat API Error:', error)
    console.error('Error details:', error instanceof Error ? error.message : error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          details: error.errors,
        },
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
            api_route: '/api/chat',
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

    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
