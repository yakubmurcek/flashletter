import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const waitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional().nullable(),
  privacyConsent: z.boolean().optional().default(true),
  marketingConsent: z.boolean().optional().default(false),
  consentTimestamp: z.string().datetime().optional(),
  userRegion: z.enum(['EU', 'US', 'OTHER']).optional().default('OTHER'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email: rawEmail,
      name,
      privacyConsent,
      marketingConsent,
      consentTimestamp,
      userRegion,
    } = waitlistSchema.parse(body)

    // Store emails in canonical form so the dedup check, unsubscribe-token
    // verification, and bare-email unsubscribe lookups all line up. Without
    // this `Foo@Bar.com` and `foo@bar.com` are different rows, and a token
    // that round-trips through `normalizeEmail` (lowercased) wouldn't match
    // the stored mixed-case row.
    const email = rawEmail.trim().toLowerCase()

    const supabase = await createClient()

    // The table is closed to client roles; waitlist_join inserts once per
    // address and reports an existing one (supabase/sql/2026-10-15-lock-waitlist.sql).
    const { data, error } = await supabase.rpc('waitlist_join', {
      p_email: email,
      p_name: name || null,
      p_privacy_consent: privacyConsent,
      p_marketing_consent: marketingConsent || false,
      p_consent_timestamp: consentTimestamp || null,
      p_user_region: userRegion || 'OTHER',
    })

    if (error || !data) {
      console.error('Waitlist signup error:', error)

      // Report to Sentry
      Sentry.captureException(error, {
        tags: { api_route: '/api/waitlist', action: 'signup' },
      })

      return NextResponse.json(
        { error: 'Failed to join waitlist. Please try again.' },
        { status: 500 },
      )
    }

    const result = data as {
      id: string
      order?: number
      total_count?: number
      already_joined: boolean
    }
    if (result.already_joined) {
      // Return 200 with the same shape as a fresh signup so callers can't
      // enumerate which addresses are already on the waitlist.
      return NextResponse.json(
        { message: 'Successfully joined the waitlist!', id: result.id, alreadyJoined: true },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        message: 'Successfully joined the waitlist!',
        id: result.id,
        order: result.order,
        totalCount: result.total_count || 0,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('Waitlist API error:', error)

    // Report to Sentry
    Sentry.captureException(error, {
      tags: { api_route: '/api/waitlist', action: 'signup' },
    })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
