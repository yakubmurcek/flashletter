import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { verifyUnsubscribeToken } from '@/lib/utils/unsubscribe-token'

/**
 * Accepts EITHER a signed token (preferred — proves the caller had access
 * to the email link we sent) OR a bare email (fallback for users who arrive
 * at /unsubscribe directly and remember their address). The response shape
 * is identical regardless of input or whether the address actually exists,
 * so callers can't enumerate the waitlist.
 */
const unsubscribeSchema = z
  .object({
    email: z.string().email('Please enter a valid email address').optional(),
    token: z.string().optional(),
  })
  .refine((d) => d.email || d.token, {
    message: 'Provide an email address or unsubscribe token',
  })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token } = unsubscribeSchema.parse(body)

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

    let resolvedEmail: string | null = null
    if (token) {
      resolvedEmail = verifyUnsubscribeToken(token)
      // Invalid/expired token → succeed silently. Returning 401/400 here
      // would let an attacker probe which tokens were ever valid.
      if (!resolvedEmail) {
        return successResponse
      }
    } else if (email) {
      resolvedEmail = email
    }

    if (!resolvedEmail) {
      return successResponse
    }

    const supabase = await createClient()

    // Actual erasure (GDPR right-to-be-forgotten) rather than the previous
    // soft-flag (privacy_consent: false). The waitlist is a marketing
    // signup, so we have no reason to keep the row once the user opts out.
    const { error } = await supabase.from('waitlist').delete().eq('email', resolvedEmail)

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
