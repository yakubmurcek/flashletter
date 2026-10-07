'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'
import { UpgradeButton } from '@/components/billing/upgrade-button'
import { PLAN_LIMITS, PRO_PRICE_USD, type BillingInterval } from '@/lib/billing/plans'
import { cn } from '@/lib/utils'

const FREE_FEATURES = [
  `${PLAN_LIMITS.free.campaignsPerMonth} campaigns a month`,
  `Sequences up to ${PLAN_LIMITS.free.maxEmailsPerCampaign} emails`,
  `${PLAN_LIMITS.free.aiRewritesPerMonth} AI rewrites a month`,
  'Rich-text editor with version history',
  'Copy into Mailchimp, Kit, Beehiiv or any ESP',
]

const PRO_FEATURES = [
  'Unlimited campaigns',
  `Sequences up to ${PLAN_LIMITS.pro.maxEmailsPerCampaign} emails`,
  'Unlimited AI rewrites',
  'Rich-text editor with version history',
  'Priority support by email',
]

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-sm text-foreground mb-8 flex-1">
      {items.map((feature) => (
        <li
          key={feature}
          className="flex items-start gap-3"
        >
          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )
}

export function PricingSection({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' }) {
  const [interval, setInterval] = useState<BillingInterval>('month')
  const Heading = headingLevel
  const proPrice = interval === 'month' ? PRO_PRICE_USD.month : PRO_PRICE_USD.year
  const monthsFree = 12 - PRO_PRICE_USD.year / PRO_PRICE_USD.month

  return (
    <section
      id="pricing"
      aria-label="Pricing"
      className="py-24 md:py-32"
    >
      <Reveal className="max-w-2xl mx-auto text-center mb-10">
        <Heading className="text-display text-3xl md:text-5xl text-foreground mb-4">
          Simple pricing.
        </Heading>
        <p className="text-muted-foreground text-lg">
          Start free. Upgrade when Flashletter is writing your emails every week.
        </p>
      </Reveal>

      <div className="flex justify-center mb-10">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="inline-flex rounded-full border border-border bg-muted/40 p-1 text-sm"
        >
          {(['month', 'year'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={interval === value}
              onClick={() => setInterval(value)}
              className={cn(
                'rounded-full px-4 py-1.5 font-medium transition-colors',
                interval === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {value === 'month' ? 'Monthly' : `Yearly · ${monthsFree} months free`}
            </button>
          ))}
        </div>
      </div>

      <Reveal
        delay={0.1}
        className="max-w-3xl mx-auto grid md:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border"
      >
        <div className="bg-background p-8 flex flex-col">
          <h3 className="text-base font-semibold text-foreground mb-1">Free</h3>
          <p className="text-sm text-muted-foreground mb-6">Try it on your own landing page.</p>
          <div className="mb-8">
            <span className="text-display text-5xl text-foreground tabular">$0</span>
          </div>
          <FeatureList items={FREE_FEATURES} />
          <Button
            variant="outline"
            className="w-full"
            asChild
          >
            <Link href="/#top">Generate from a URL</Link>
          </Button>
        </div>

        <div className="relative bg-background p-8 flex flex-col">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-base font-semibold text-primary">Pro</h3>
            <span className="text-xs uppercase tracking-widest text-primary">Most popular</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            For founders shipping launches and newsletters.
          </p>
          <div className="mb-8">
            <span className="text-display text-5xl text-foreground tabular">${proPrice}</span>
            <span className="text-muted-foreground text-base ml-1">
              /{interval === 'month' ? 'month' : 'year'}
            </span>
          </div>
          <FeatureList items={PRO_FEATURES} />
          <UpgradeButton interval={interval}>Upgrade to Pro</UpgradeButton>
          <p className="mt-3 text-xs text-center text-muted-foreground">
            Secure checkout by Stripe. Cancel anytime.
          </p>
        </div>
      </Reveal>
    </section>
  )
}
