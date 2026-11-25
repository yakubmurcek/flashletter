import Stripe from 'stripe'
import { getRedis } from '@/lib/utils/rate-limit'
import type { BillingInterval } from './plans'

/**
 * Stripe is the source of truth for who pays. Customers carry
 * `metadata.user_id` (the Supabase user id); Redis only caches lookups so a
 * page load doesn't call Stripe every time.
 */

let client: Stripe | null = null

export function isBillingEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY environment variable')
  client ??= new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: 'Flashletter' } })
  return client
}

export interface SubscriptionSummary {
  active: boolean
  status: Stripe.Subscription.Status | null
  interval: BillingInterval | null
  currentPeriodEnd: number | null
  cancelAtPeriodEnd: boolean
  customerId: string | null
}

const NONE: SubscriptionSummary = {
  active: false,
  status: null,
  interval: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  customerId: null,
}

const customerKey = (userId: string) => `flashletter:billing:customer:${userId}`
const summaryKey = (userId: string) => `flashletter:billing:summary:${userId}`
const SUMMARY_TTL_SECONDS = 60
// The plan Stripe last confirmed, kept longer than any billing period, so a Stripe
// outage falls back to it (lib/billing/limits.ts getPlan) instead of guessing.
const lastPlanKey = (userId: string) => `flashletter:billing:last-plan:${userId}`
const LAST_PLAN_TTL_SECONDS = 40 * 24 * 60 * 60

export async function rememberPlan(userId: string, plan: 'pro' | 'free') {
  await getRedis()
    ?.set(lastPlanKey(userId), plan, { ex: LAST_PLAN_TTL_SECONDS })
    .catch(() => undefined)
}

export async function lastKnownPlan(userId: string): Promise<'pro' | 'free' | null> {
  const plan = await getRedis()
    ?.get<string>(lastPlanKey(userId))
    .catch(() => null)
  return plan === 'pro' || plan === 'free' ? plan : null
}

// Stripe search only accepts quoted literals; user ids are UUIDs, but be strict.
function assertUuid(userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Invalid user id')
}

export interface BillingUser {
  id: string
  email?: string | null
}

const ownedBy = (userId: string) => (c: Stripe.Customer | Stripe.DeletedCustomer) =>
  !('deleted' in c && c.deleted) && (c as Stripe.Customer).metadata?.user_id === userId

export async function findCustomerId(user: BillingUser): Promise<string | null> {
  assertUuid(user.id)
  const redis = getRedis()
  const cached = await redis?.get<string>(customerKey(user.id)).catch(() => null)
  if (cached) return cached

  // Listing by email is read-after-write consistent, so a brand-new customer is
  // found at once; search lags about a minute and only covers changed emails.
  let id: string | null = null
  if (user.email) {
    const byEmail = await getStripe().customers.list({ email: user.email, limit: 10 })
    id = byEmail.data.find(ownedBy(user.id))?.id ?? null
  }
  if (!id) {
    const result = await getStripe().customers.search({
      query: `metadata['user_id']:'${user.id}'`,
      limit: 1,
    })
    id = result.data[0]?.id ?? null
  }
  if (id) await redis?.set(customerKey(user.id), id).catch(() => undefined)
  return id
}

export async function getOrCreateCustomer(user: BillingUser): Promise<string> {
  const existing = await findCustomerId(user)
  if (existing) return existing
  const { id: userId, email } = user
  const customer = await getStripe().customers.create(
    { email: email ?? undefined, metadata: { user_id: userId } },
    // A double click must not create two customers for one user. Stripe search
    // lags ~1 min behind writes, so a quick retry lands here again; the key must
    // match the exact parameters or Stripe rejects it.
    { idempotencyKey: `customer-${userId}-${email ?? ''}` },
  )
  await getRedis()
    ?.set(customerKey(userId), customer.id)
    .catch(() => undefined)
  return customer.id
}

function summarize(sub: Stripe.Subscription, customerId: string): SubscriptionSummary {
  const item = sub.items.data[0]
  const raw = item?.price.recurring?.interval
  const interval: BillingInterval | null =
    raw === 'month' ? 'month' : raw === 'year' ? 'year' : null
  return {
    active: sub.status === 'active' || sub.status === 'trialing',
    status: sub.status,
    interval,
    // The customer portal schedules a cancellation as `cancel_at` (a date) on
    // current API versions, leaving `cancel_at_period_end` false; treat either
    // as "ends on" so the account page doesn't promise a renewal.
    currentPeriodEnd: sub.cancel_at ?? item?.current_period_end ?? null,
    cancelAtPeriodEnd: sub.cancel_at_period_end || sub.cancel_at !== null,
    customerId,
  }
}

const ENDED_STATUSES = new Set<Stripe.Subscription.Status>(['canceled', 'incomplete_expired'])

export async function getSubscriptionSummary(
  user: BillingUser,
  { fresh = false } = {},
): Promise<SubscriptionSummary> {
  const userId = user.id
  if (!isBillingEnabled()) return NONE
  const redis = getRedis()
  if (!fresh) {
    const cached = await redis?.get<SubscriptionSummary>(summaryKey(userId)).catch(() => null)
    if (cached) return cached
  }

  const customerId = await findCustomerId(user)
  let summary: SubscriptionSummary = NONE
  if (customerId) {
    const subs = await getStripe().subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    })
    // Prefer a live subscription, then one that still exists but is unpaid or
    // paused (a newer canceled one must not hide it, or checkout would sell a
    // second subscription); otherwise report the most recent one.
    const live = subs.data.find((s) => s.status === 'active' || s.status === 'trialing')
    const open = subs.data.find((s) => !ENDED_STATUSES.has(s.status))
    const pick = live ?? open ?? subs.data[0]
    summary = pick ? summarize(pick, customerId) : { ...NONE, customerId }
  }
  await redis?.set(summaryKey(userId), summary, { ex: SUMMARY_TTL_SECONDS }).catch(() => undefined)
  await rememberPlan(userId, summary.active ? 'pro' : 'free')
  return summary
}

export async function clearSubscriptionCache(userId: string) {
  await getRedis()
    ?.del(summaryKey(userId))
    .catch(() => undefined)
}

export async function getPriceId(lookupKey: string): Promise<string> {
  const prices = await getStripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  const price = prices.data[0]
  if (!price) throw new Error(`No active Stripe price with lookup key ${lookupKey}`)
  return price.id
}
