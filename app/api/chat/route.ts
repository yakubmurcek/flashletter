import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requestSchema } from './schemas'
import { buildSystemInstructions } from './prompt-builder'
import { chatOutputSchema, toChatResponse } from './response-handler'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, chatRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
import { generateStructured, extractRateLimitInfo, isRateLimitError } from '@/lib/ai'
import { getClientIp } from '@/lib/utils/get-client-ip'
import { consumeAiRewrite, getPlan, refundAiRewrite } from '@/lib/billing/limits'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Require auth — same money-leak concern as the generate-emails routes.
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const identifier = user.id || getClientIp(req)

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

    // Send the whole conversation so follow-ups ("make it shorter") have context.
    // Client-sent system messages are ignored; only the server sets instructions.
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    // The conversation must start and end on a user turn (no assistant prefill).
    while (history.length && history[0].role !== 'user') history.shift()
    while (history.length && history[history.length - 1].role !== 'user') history.pop()
    if (!history.length) {
      return NextResponse.json({ error: 'No user message' }, { status: 400 })
    }

    // Counted before the call so parallel requests can't overshoot the limit;
    // given back below if the AI fails, since the user got nothing for it.
    const plan = await getPlan(user)
    const rewriteDenial = await consumeAiRewrite(user.id, plan)
    if (rewriteDenial) {
      return NextResponse.json(rewriteDenial, { status: 402 })
    }

    let parsedResponse: ReturnType<typeof toChatResponse>
    try {
      const output = await generateStructured({
        system: instructions,
        messages: history,
        schema: chatOutputSchema,
        maxTokens: 16000,
      })
      parsedResponse = toChatResponse(output)
    } catch (error) {
      await refundAiRewrite(user.id, plan).catch(() => undefined)
      throw error
    }

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

    if (isRateLimitError(error)) {
      const rateLimitInfo = extractRateLimitInfo(error)

      // Report to Sentry as warning (expected but needs visibility)
      Sentry.captureException(error, {
        level: 'warning',
        tags: {
          error_type: 'ai_rate_limit',
          api_route: '/api/chat',
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

    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
