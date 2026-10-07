import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findCustomerId, getStripe, isBillingEnabled } from '@/lib/billing/stripe'

/** Opens the Stripe customer portal (change plan, card, invoices, cancel). */
export async function POST(req: NextRequest) {
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: 'Billing is not available yet' }, { status: 503 })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const customer = await findCustomerId(user)
    if (!customer) {
      return NextResponse.json({ error: 'No billing account yet' }, { status: 404 })
    }
    const origin = req.nextUrl.origin
    const session = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: `${origin}/account`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'billing', route: 'portal' } })
    console.error('[billing] portal failed:', error)
    return NextResponse.json({ error: 'Could not open billing' }, { status: 500 })
  }
}
