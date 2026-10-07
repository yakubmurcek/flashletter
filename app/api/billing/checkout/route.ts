import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { PRICE_LOOKUP_KEYS } from '@/lib/billing/plans'
import {
  getOrCreateCustomer,
  getPriceId,
  getStripe,
  getSubscriptionSummary,
  isBillingEnabled,
} from '@/lib/billing/stripe'

const bodySchema = z.object({ interval: z.enum(['month', 'year']).default('month') })

// Return to the host the user is on (production, or a preview while testing).
function appOrigin(req: NextRequest) {
  return req.nextUrl.origin
}

/** Starts a Stripe Checkout session for Pro and returns its hosted URL. */
export async function POST(req: NextRequest) {
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: 'Billing is not available yet' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: 'Create an account first' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const summary = await getSubscriptionSummary(user.id, { fresh: true })
    const origin = appOrigin(req)
    const customer = await getOrCreateCustomer(user.id, user.email)

    // Already subscribed: send them to manage the plan instead of paying twice.
    if (summary.active) {
      const portal = await getStripe().billingPortal.sessions.create({
        customer,
        return_url: `${origin}/account`,
      })
      return NextResponse.json({ url: portal.url })
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      line_items: [
        { price: await getPriceId(PRICE_LOOKUP_KEYS[parsed.data.interval]), quantity: 1 },
      ],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: { address: 'auto', name: 'auto' },
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${origin}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'billing', route: 'checkout' } })
    console.error('[billing] checkout failed:', error)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 })
  }
}
