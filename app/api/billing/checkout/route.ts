import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, checkoutRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
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

/**
 * Subscriptions that still exist and can still bill or become Pro, so a new
 * checkout would start a second one. Past-due, unpaid and paused ones are
 * fixed by updating the card in the portal. Incomplete means the first
 * payment is still pending (e.g. 3-D Secure); it can still succeed for about
 * 23 hours, after which Stripe expires it and a new checkout is allowed again.
 * Canceled and incomplete_expired can never bill again.
 */
const EXISTING_SUBSCRIPTION = new Set<string>([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'paused',
  'incomplete',
])

// Return to the host the user is on (production, or a preview while testing).
function appOrigin(req: NextRequest) {
  return req.nextUrl.origin
}

/** The hosted page for an incomplete subscription's unpaid first invoice, if any. */
async function openFirstInvoiceUrl(customer: string): Promise<string | null> {
  const subs = await getStripe().subscriptions.list({
    customer,
    status: 'incomplete',
    limit: 1,
    expand: ['data.latest_invoice'],
  })
  const invoice = subs.data[0]?.latest_invoice
  return invoice && typeof invoice !== 'string' ? (invoice.hosted_invoice_url ?? null) : null
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

  const rate = await checkRateLimit(checkoutRateLimit, user.id)
  if (!rate.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Too many upgrade attempts. Try again in a few minutes.',
      },
      { status: 429, headers: getRateLimitHeaders(rate.limit, rate.remaining, rate.reset) },
    )
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const summary = await getSubscriptionSummary(user, { fresh: true })
    const origin = appOrigin(req)
    const customer = await getOrCreateCustomer(user)

    // First payment still open: finish paying it, not start a second subscription.
    if (summary.status === 'incomplete') {
      const invoiceUrl = await openFirstInvoiceUrl(customer)
      if (invoiceUrl) return NextResponse.json({ url: invoiceUrl })
    }

    // Already subscribed: send them to manage the plan instead of paying twice.
    if (summary.active || (summary.status && EXISTING_SUBSCRIPTION.has(summary.status))) {
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
