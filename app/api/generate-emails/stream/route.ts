import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { aiEmailsResponseSchema, generateEmailsRequestSchema } from '@/lib'
import {
  checkUserAndIpRateLimit,
  generateEmailsIpRateLimit,
  generateEmailsRateLimit,
  getRateLimitHeaders,
} from '@/lib/utils/rate-limit'
import { generateStructured, extractRateLimitInfo, isRateLimitError } from '@/lib/ai'
import { getClientIp } from '@/lib/utils/get-client-ip'
import { checkCampaignAllowed, checkEmailCount, getPlan } from '@/lib/billing/limits'
import { buildFirstEmailInstructions, buildRemainingEmailsInstructions } from '../prompts'
import { fixEmailLinks } from '@/lib/utils/email-links'
import type { Email } from '@/lib/schemas'

// Long Pro sequences (up to 30 emails) take minutes; let the function run up
// to Vercel's limit instead of the platform default.
export const maxDuration = 300

// Days 2..N are written in parallel batches of this size, so a 30-email run
// costs about as much wall time as a 10-email one.
const DAYS_PER_BATCH = 10

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
  // be able to spend AI tokens.
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

  const plan = await getPlan(user)
  const denial =
    checkEmailCount(plan, parsedBody.config.days) ??
    (await checkCampaignAllowed(supabase, user.id, plan, parsedBody.campaignId))
  if (denial) {
    return NextResponse.json(denial, { status: 402 })
  }

  const rateLimitResult = await checkUserAndIpRateLimit(
    generateEmailsRateLimit,
    generateEmailsIpRateLimit,
    user.id,
    getClientIp(req),
  )

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

  // Set when the client goes away: a newer run on this campaign aborted
  // this one, or the user closed the tab. A run that has not saved its
  // Day 1 by then writes nothing; one that has finishes its own sequence
  // (or trims it) so the campaign is never half old, half new.
  let cancelled = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }
      const storage = campaignId ? new CampaignStorageService(supabase) : null
      const reportSaveError = (saveError: unknown, step: string) => {
        console.error(`Failed to save streamed emails (${step}):`, saveError)
        Sentry.captureException(saveError, {
          tags: {
            error_type: 'save_streamed_emails',
            api_route: '/api/generate-emails/stream',
          },
          extra: { step },
        })
      }

      // Emails generated so far, with their database ids once saved.
      const allEmails: Email[] = []
      let savedDay1 = false

      try {
        send({ type: 'start', total: config.days })

        // Phase 1: generate Day 1 alone — this is what the user sees first.
        const firstParsed = await generateStructured({
          system: buildFirstEmailInstructions(config, landingUrl, landingContent, landingAnalysis),
          messages: [{ role: 'user', content: 'Generate Day 1 only.' }],
          schema: aiEmailsResponseSchema,
        })
        if (!firstParsed.emails[0]) {
          throw new Error('No Day 1 email returned')
        }

        const rawFirst = firstParsed.emails[0]
        let firstEmail: Email = {
          id: 1,
          uuid: null,
          day: 1,
          subject: rawFirst.subject || '',
          preview: rawFirst.preview || '',
          // Relative or unsafe links are dead once pasted into an email tool.
          content: fixEmailLinks(rawFirst.content || '', landingUrl),
        }

        // Save Day 1 before showing it, so the editor gets its real id and
        // edits to it are kept even if the rest of the sequence fails.
        // Upsert only: the old Days 2..N (and their history) stay until
        // this run replaces or trims them.
        if (storage && campaignId && !cancelled) {
          try {
            const [savedFirst] = await storage.upsertEmails(campaignId, [firstEmail])
            if (savedFirst) {
              firstEmail = savedFirst
              savedDay1 = true
            }
          } catch (saveError) {
            reportSaveError(saveError, 'day 1')
          }
        }

        allEmails.push(firstEmail)
        send({ type: 'email', email: firstEmail })

        // Phase 2: generate Days 2..N referencing Day 1 for coherence, in
        // parallel batches. A batch that comes back short is asked once more
        // for its missing days.
        const firstForPrompt = {
          subject: firstEmail.subject,
          preview: firstEmail.preview,
          content: firstEmail.content,
        }
        const generateRange = async (from: number, to: number) => {
          const parsed = await generateStructured({
            system: buildRemainingEmailsInstructions(
              config,
              landingUrl,
              firstForPrompt,
              landingContent,
              landingAnalysis,
              { from, to },
            ),
            messages: [{ role: 'user', content: `Generate Days ${from} through ${to}.` }],
            schema: aiEmailsResponseSchema,
          })
          // Cap at the range so an over-long response can't clobber.
          return parsed.emails.slice(0, to - from + 1)
        }
        const fillRange = async (from: number, to: number) => {
          const got = await generateRange(from, to)
          if (from + got.length > to) return got
          const more = await generateRange(from + got.length, to)
          return [...got, ...more]
        }

        const ranges: Array<{ from: number; to: number }> = []
        for (let from = 2; from <= config.days; from += DAYS_PER_BATCH) {
          ranges.push({ from, to: Math.min(from + DAYS_PER_BATCH - 1, config.days) })
        }
        const settled = await Promise.allSettled(ranges.map(({ from, to }) => fillRange(from, to)))

        // Keep batches in order up to the first one that failed or stayed
        // short: a later batch's emails were written for later days, so
        // appending them after a gap would shift every email a day early.
        // Whatever is missing is reported through the short warning.
        const rest: Email[] = []
        for (let b = 0; b < settled.length; b++) {
          const result = settled[b]
          if (result.status === 'rejected') {
            Sentry.captureException(result.reason, {
              tags: { error_type: 'generate_batch', api_route: '/api/generate-emails/stream' },
              extra: { from: ranges[b].from, to: ranges[b].to },
            })
            // Nothing after Day 1 came back: fail like before.
            if (rest.length === 0) throw result.reason
            break
          }
          for (const raw of result.value) {
            const day = rest.length + 2
            rest.push({
              id: day,
              uuid: null,
              day,
              subject: raw.subject || '',
              preview: raw.preview || '',
              content: fixEmailLinks(raw.content || '', landingUrl),
            })
          }
          if (result.value.length < ranges[b].to - ranges[b].from + 1) break
        }

        const shortWarning =
          rest.length + 1 < config.days
            ? `Claude wrote ${rest.length + 1} of the ${config.days} emails you asked for. Regenerate to try for the full sequence.`
            : undefined

        // Persist the rest, then drop any old days past the new end. Day 1
        // is not written again (unless its early save failed): the user may
        // have edited it while the rest was generating.
        let saveWarning: string | undefined = shortWarning
        let savedRest = rest
        if (storage && campaignId && (savedDay1 || !cancelled)) {
          const unsaved = [...(savedDay1 ? [] : [firstEmail]), ...rest]
          try {
            const saved = unsaved.length > 0 ? await storage.upsertEmails(campaignId, unsaved) : []
            const savedFirst = saved.find((e) => e.day === 1)
            if (savedFirst) {
              firstEmail = savedFirst
              allEmails[0] = savedFirst
            }
            savedRest = rest.map((email) => saved.find((e) => e.day === email.day) ?? email)
            await storage.deleteEmailsAfterDay(campaignId, 1 + rest.length)
          } catch (saveError) {
            reportSaveError(saveError, 'sequence')
            // Surface the failure to the client so the UI can react. Emails are
            // still returned (without UUIDs) so the user doesn't lose generated
            // content, but version tracking won't work until they re-save.
            saveWarning = [shortWarning, 'Could not persist emails; returned without persistence']
              .filter(Boolean)
              .join(' ')
          }
        }

        for (const email of savedRest) {
          allEmails.push(email)
          send({ type: 'email', email })
        }

        send({ type: 'complete', emails: allEmails, warning: saveWarning })
      } catch (error) {
        console.error('Generate Emails Stream Error:', error)

        // Keep the campaign matching what the editor shows: the saved Day 1
        // and nothing after it, so a retry or a reload can't mix runs. Only
        // when Day 1 really was saved, or the old sequence would lose its
        // later days and keep its old Day 1.
        if (storage && campaignId && savedDay1 && allEmails.length === 1) {
          try {
            await storage.deleteEmailsAfterDay(campaignId, 1)
          } catch (trimError) {
            reportSaveError(trimError, 'trim after failure')
          }
        }

        let message = 'Failed to generate emails'
        if (isRateLimitError(error)) {
          message = 'Too many requests to AI service. Please try again later.'
          Sentry.captureException(error, {
            level: 'warning',
            tags: {
              error_type: 'ai_rate_limit',
              api_route: '/api/generate-emails/stream',
            },
            extra: { rateLimitInfo: extractRateLimitInfo(error) },
          })
        } else if (error instanceof Error) {
          message = error.message
        }

        if (!cancelled) send({ type: 'error', message })
      } finally {
        if (!cancelled) controller.close()
      }
    },
    cancel() {
      cancelled = true
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
