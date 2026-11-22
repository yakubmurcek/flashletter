#!/usr/bin/env node
// One-time, idempotent Stripe setup for Flashletter Pro. Safe to re-run.
// Creates (or finds) the Pro product, the monthly and yearly prices by lookup
// key, and a customer-portal configuration.
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs https://flashletter.app
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('Set STRIPE_SECRET_KEY first.')
  process.exit(1)
}
const siteUrl = process.argv[2] || 'https://flashletter.app'
const stripe = new Stripe(key)
const mode = key.startsWith('sk_live_') ? 'LIVE' : 'test'

const PRICES = [
  { lookup_key: 'flashletter_pro_monthly', unit_amount: 1900, interval: 'month' },
  { lookup_key: 'flashletter_pro_yearly', unit_amount: 19000, interval: 'year' },
]

async function findOrCreateProduct() {
  const existing = await stripe.products.search({
    query: "metadata['app']:'flashletter' AND active:'true'",
  })
  if (existing.data[0]) return existing.data[0]
  return stripe.products.create({
    name: 'Flashletter Pro',
    description: 'Unlimited AI email campaigns from your landing page.',
    metadata: { app: 'flashletter' },
    tax_code: 'txcd_10103001', // SaaS - business use
  })
}

const product = await findOrCreateProduct()
console.log(`[${mode}] product ${product.id} (${product.name})`)

const priceIds = []
for (const p of PRICES) {
  const found = await stripe.prices.list({ lookup_keys: [p.lookup_key], active: true, limit: 1 })
  let price = found.data[0]
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: p.unit_amount,
      recurring: { interval: p.interval },
      lookup_key: p.lookup_key,
      tax_behavior: 'exclusive',
    })
  }
  priceIds.push(price.id)
  console.log(
    `[${mode}] price ${price.id} ${p.lookup_key} $${price.unit_amount / 100}/${p.interval}`,
  )
}

const configs = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 })
const portalSettings = {
  business_profile: {
    headline: 'Manage your Flashletter subscription',
    privacy_policy_url: `${siteUrl}/privacy`,
    terms_of_service_url: `${siteUrl}/terms`,
  },
  default_return_url: `${siteUrl}/account`,
  features: {
    customer_update: { enabled: true, allowed_updates: ['email', 'address', 'tax_id'] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: 'at_period_end' },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price'],
      proration_behavior: 'create_prorations',
      products: [{ product: product.id, prices: priceIds }],
    },
  },
}
const portal = configs.data[0]
  ? await stripe.billingPortal.configurations.update(configs.data[0].id, portalSettings)
  : await stripe.billingPortal.configurations.create(portalSettings)
console.log(`[${mode}] customer portal ${portal.id} ready`)
