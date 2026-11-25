import * as Sentry from '@sentry/nextjs'
import { type NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/lib/utils/get-client-ip'
import {
  checkIpRateLimit,
  getRateLimitHeaders,
  unsubscribeIpRateLimit,
} from '@/lib/utils/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { verifyUnsubscribeToken } from '@/lib/utils/unsubscribe-token'

/**
 * Only the signed link from a waitlist email can unsubscribe someone: the
 * token proves the caller had access to that inbox. A bare email is never
 * accepted (anyone could remove anyone by typing their address); people
 * without the link write to the contact address on /unsubscribe instead.
 * The response shape is identical whether the token verified or the address
 * exists, so callers can't enumerate the waitlist.
 */
const unsubscribeSchema = z.object({
  token: z.string().min(1, 'Use the unsubscribe link from one of our emails'),
})

export async function POST(request: NextRequest) {
  try {
    const ipLimit = await checkIpRateLimit(unsubscribeIpRateLimit, getClientIp(request))
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Too many attempts. Try again in a few minutes.' },
        {
          status: 429,
          headers: getRateLimitHeaders(ipLimit.limit, ipLimit.remaining, ipLimit.reset),
        },
      )
    }
    const body = await request.json()
    const { token } = unsubscribeSchema.parse(body)

    // Uniform success response — never reveals whether the address was on
    // the list, whether the token verified, or whether the row was actually
    // deleted. Treats unsubscribe as idempotent from the caller's view.
    const successResponse = NextResponse.json(
      {
        message:
          'If that email is on our waitlist, it has been removed. You will no longer receive updates.',
      },
      { status: 200 },
    )

    // verifyUnsubscribeToken returns the canonical (lowercased+trimmed)
    // email, which matches how the signup route stores it.
    const resolvedEmail = verifyUnsubscribeToken(token)
    // Invalid/expired token → succeed silently. Returning 401/400 here
    // would let an attacker probe which tokens were ever valid.
    if (!resolvedEmail) {
      return successResponse
    }

    // Service role: the function is closed to anon/authenticated so the
    // public anon key can't call it directly and skip the token check above.
    const supabase = createAdminClient()

    // Actual erasure (GDPR right-to-be-forgotten) rather than the previous
    // soft-flag (privacy_consent: false). The waitlist is a marketing
    // signup, so we have no reason to keep the row once the user opts out.
    // The table and this function are closed to client roles.
    const { error } = await supabase.rpc('waitlist_unsubscribe', { p_email: resolvedEmail })

    if (error) {
      console.error('Unsubscribe error:', error)
      Sentry.captureException(error, {
        tags: { api_route: '/api/waitlist/unsubscribe' },
      })
      return NextResponse.json(
        { error: 'Failed to unsubscribe. Please try again.' },
        { status: 500 },
      )
    }

    return successResponse
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('Unsubscribe API error:', error)
    Sentry.captureException(error, {
      tags: { api_route: '/api/waitlist/unsubscribe' },
    })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
