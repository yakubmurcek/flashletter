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

// Stripe search only accepts quoted literals; user ids are UUIDs, but be strict.
function assertUuid(userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Invalid user id')
}

export async function findCustomerId(userId: string): Promise<string | null> {
  assertUuid(userId)
  const redis = getRedis()
  const cached = await redis?.get<string>(customerKey(userId)).catch(() => null)
  if (cached) return cached

  const result = await getStripe().customers.search({
    query: `metadata['user_id']:'${userId}'`,
    limit: 1,
  })
  const id = result.data[0]?.id ?? null
  if (id) await redis?.set(customerKey(userId), id).catch(() => undefined)
  return id
}

export async function getOrCreateCustomer(userId: string, email?: string | null): Promise<string> {
  const existing = await findCustomerId(userId)
  if (existing) return existing
  const customer = await getStripe().customers.create(
    { email: email ?? undefined, metadata: { user_id: userId } },
    // A double click must not create two customers for one user.
    { idempotencyKey: `customer-${userId}` },
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
    currentPeriodEnd: item?.current_period_end ?? null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    customerId,
  }
}

export async function getSubscriptionSummary(
  userId: string,
  { fresh = false } = {},
): Promise<SubscriptionSummary> {
  if (!isBillingEnabled()) return NONE
  const redis = getRedis()
  if (!fresh) {
    const cached = await redis?.get<SubscriptionSummary>(summaryKey(userId)).catch(() => null)
    if (cached) return cached
  }

  const customerId = await findCustomerId(userId)
  let summary: SubscriptionSummary = NONE
  if (customerId) {
    const subs = await getStripe().subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    })
    // Prefer a live subscription; otherwise report the most recent one.
    const live = subs.data.find((s) => s.status === 'active' || s.status === 'trialing')
    const pick = live ?? subs.data[0]
    summary = pick ? summarize(pick, customerId) : { ...NONE, customerId }
  }
  await redis?.set(summaryKey(userId), summary, { ex: SUMMARY_TTL_SECONDS }).catch(() => undefined)
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
