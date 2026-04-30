import * as Sentry from '@sentry/nextjs'
import { openai } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { zodTextFormat } from 'openai/helpers/zod'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { aiEmailsResponseSchema, generateEmailsRequestSchema } from '@/lib'
import {
  checkRateLimit,
  generateEmailsRateLimit,
  getRateLimitHeaders,
} from '@/lib/utils/rate-limit'
import { retryWithBackoff, extractRateLimitInfo } from '@/lib/utils/openai-retry'
import { getClientIp } from '@/lib/utils/get-client-ip'
import { buildFirstEmailInstructions, buildRemainingEmailsInstructions } from '../prompts'
import type { Email } from '@/lib/schemas'

type StreamEvent =
  | { type: 'start'; total: number }
  | { type: 'email'; email: Email }
  | { type: 'complete'; emails: Email[]; warning?: string }
  | { type: 'error'; message: string }

export async function POST(req: NextRequest) {
  // Auth + rate limit + parse outside the stream so we can return clean 4xx JSON.
  let parsedBody: z.infer<typeof generateEmailsRequestSchema>
  try {
    const body = await req.json()
    parsedBody = generateEmailsRequestSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Require auth before opening the stream — anonymous callers shouldn't
  // be able to spend OpenAI tokens.
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // If a campaignId is provided, the caller must own it. Defence-in-depth
  // on top of RLS — a misconfigured policy would otherwise let any
  // authenticated user wipe another user's emails.
  if (parsedBody.campaignId) {
    const ownershipService = new CampaignStorageService(supabase)
    const owned = await ownershipService.isOwnedBy(parsedBody.campaignId, user.id)
    if (!owned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

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

  const { landingUrl, landingContent, landingAnalysis, config, campaignId } = parsedBody
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      try {
        send({ type: 'start', total: config.days })

        // Phase 1: generate Day 1 alone — this is what the user sees first.
        const firstResponse = await retryWithBackoff(() =>
          openai.responses.parse({
            model: 'gpt-5',
            input: [
              {
                role: 'system',
                content: buildFirstEmailInstructions(
                  config,
                  landingUrl,
                  landingContent,
                  landingAnalysis,
                ),
              },
              { role: 'user', content: 'Generate Day 1 only. Return only valid JSON.' },
            ],
            text: { format: zodTextFormat(aiEmailsResponseSchema, 'emails_response') },
          }),
        )

        const firstParsed = firstResponse.output_parsed
        if (!firstParsed?.emails?.[0]) {
          throw new Error('No Day 1 email returned from OpenAI')
        }

        const rawFirst = firstParsed.emails[0]
        const firstEmail: Email = {
          id: 1,
          uuid: null,
          day: 1,
          subject: rawFirst.subject || '',
          preview: rawFirst.preview || '',
          content: rawFirst.content || '',
        }

        send({ type: 'email', email: firstEmail })

        const allEmails: Email[] = [firstEmail]

        // Phase 2: generate Days 2..N referencing Day 1 for coherence.
        if (config.days > 1) {
          const remainingResponse = await retryWithBackoff(() =>
            openai.responses.parse({
              model: 'gpt-5',
              input: [
                {
                  role: 'system',
                  content: buildRemainingEmailsInstructions(
                    config,
                    landingUrl,
                    {
                      subject: firstEmail.subject,
                      preview: firstEmail.preview,
                      content: firstEmail.content,
                    },
                    landingContent,
                    landingAnalysis,
                  ),
                },
                {
                  role: 'user',
                  content: `Generate Days 2 through ${config.days}. Return only valid JSON.`,
                },
              ],
              text: { format: zodTextFormat(aiEmailsResponseSchema, 'emails_response') },
            }),
          )

          const remainingParsed = remainingResponse.output_parsed
          if (!remainingParsed?.emails) {
            throw new Error('No remaining emails returned from OpenAI')
          }

          // Force the day number from the index — never trust the model. Phase 2
          // is asked for Days 2..N, so position i (0-based) maps to day i + 2.
          // We also cap at config.days so an over-long response can't clobber.
          const slots = config.days - 1
          const usable = remainingParsed.emails.slice(0, slots)
          for (let i = 0; i < usable.length; i++) {
            const raw = usable[i]
            const day = i + 2
            const email: Email = {
              id: day,
              uuid: null,
              day,
              subject: raw.subject || '',
              preview: raw.preview || '',
              content: raw.content || '',
            }
            allEmails.push(email)
            send({ type: 'email', email })
          }
        }

        // Persist the full batch once generation is complete.
        let saved = allEmails
        let saveWarning: string | undefined
        if (campaignId) {
          try {
            const campaignService = new CampaignStorageService(supabase)
            saved = await campaignService.saveEmails(campaignId, allEmails)
          } catch (saveError) {
            console.error('Failed to save streamed emails:', saveError)
            Sentry.captureException(saveError, {
              tags: {
                error_type: 'save_streamed_emails',
                api_route: '/api/generate-emails/stream',
              },
            })
            // Surface the failure to the client so the UI can react. Emails are
            // still returned (without UUIDs) so the user doesn't lose generated
            // content, but version tracking won't work until they re-save.
            saveWarning = 'Could not persist emails; returned without persistence'
          }
        }

        send({ type: 'complete', emails: saved, warning: saveWarning })
      } catch (error) {
        console.error('Generate Emails Stream Error:', error)

        let message = 'Failed to generate emails'
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
          message = 'Too many requests to AI service. Please try again later.'
          Sentry.captureException(error, {
            level: 'warning',
            tags: {
              error_type: 'openai_rate_limit',
              api_route: '/api/generate-emails/stream',
            },
            extra: { rateLimitInfo: extractRateLimitInfo(error) },
          })
        } else if (error instanceof Error) {
          message = error.message
        }

        send({ type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      ...getRateLimitHeaders(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset,
      ),
    },
  })
}
