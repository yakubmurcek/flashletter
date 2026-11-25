import * as Sentry from '@sentry/nextjs'
import {
  clearSubscriptionCache,
  rememberPlan,
  getStripe,
  isBillingEnabled,
} from '@/lib/billing/stripe'

/**
 * - 'paid': the checkout is finished and the money is in (or none was due).
 * - 'processing': the checkout is finished but a delayed payment method (bank
 *   debit and the like) hasn't cleared, so the plan is still Free.
 * - null: no session, not this user's session, not finished, or Stripe failed.
 */
export type CheckoutOutcome = 'paid' | 'processing' | null

/** Confirms a just-finished Checkout belongs to this user and refreshes the plan when paid. */
export async function confirmCheckout(
  userId: string,
  sessionId: string | undefined,
): Promise<CheckoutOutcome> {
  if (!sessionId || !isBillingEnabled()) return null
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    if (session.client_reference_id !== userId || session.status !== 'complete') return null
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return 'processing'
    }
    await clearSubscriptionCache(userId)
    // Pro from this moment, even if Stripe's API stumbles on the next page load.
    await rememberPlan(userId, 'pro')
    return 'paid'
  } catch (error) {
    // The user may have just paid and now sees no Pro: this must reach us.
    Sentry.captureException(error, { tags: { area: 'billing' }, extra: { sessionId } })
    return null
  }
}
