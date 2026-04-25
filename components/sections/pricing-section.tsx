import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import Link from 'next/link'

type Tier = {
  name: string
  price: string
  period?: string
  blurb: string
  cta: string
  href: string
  features: string[]
  recommended?: boolean
  variant?: 'default' | 'outline'
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    blurb: 'For trying it out.',
    cta: 'Get started',
    href: '/signup',
    variant: 'outline',
    features: [
      '3 campaigns / month',
      'AI generation from any URL',
      'Full editor access',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    blurb: 'For founders shipping regularly.',
    cta: 'Start Pro',
    href: '/signup',
    recommended: true,
    features: [
      'Unlimited campaigns',
      'Advanced AI controls',
      'Version history',
      'Analytics & insights',
      'Priority support',
    ],
  },
  {
    name: 'Team',
    price: '$49',
    period: '/mo',
    blurb: 'For small teams collaborating.',
    cta: 'Contact sales',
    href: '/signup',
    variant: 'outline',
    features: [
      'Everything in Pro',
      'Team workspaces',
      'Role permissions',
      'Advanced analytics',
      'Dedicated support',
    ],
  },
]

export function PricingSection() {
  return (
    <section
      id="pricing"
      aria-label="Pricing"
      className="py-24 md:py-32"
    >
      <div className="max-w-2xl mx-auto text-center mb-14">
        <h2 className="text-display text-3xl md:text-5xl text-foreground mb-4">Simple pricing.</h2>
        <p className="text-muted-foreground text-lg">Start free. Upgrade when you need to.</p>
      </div>

      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className="relative bg-background p-8 flex flex-col"
          >
            {tier.recommended && <div className="absolute top-0 left-0 right-0 h-px bg-primary" />}
            <div className="flex items-baseline justify-between mb-1">
              <h3
                className={`text-base font-semibold ${
                  tier.recommended ? 'text-primary' : 'text-foreground'
                }`}
              >
                {tier.name}
              </h3>
              {tier.recommended && (
                <span className="text-xs uppercase tracking-widest text-primary">Recommended</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-6">{tier.blurb}</p>

            <div className="mb-8">
              <span className="text-display text-5xl text-foreground tabular">{tier.price}</span>
              {tier.period && (
                <span className="text-muted-foreground text-base ml-1">{tier.period}</span>
              )}
            </div>

            <ul className="space-y-3 text-sm text-foreground mb-8 flex-1">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3"
                >
                  <Check className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={tier.variant ?? 'default'}
              className="w-full"
              asChild
            >
              <Link href={tier.href}>{tier.cta}</Link>
            </Button>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center mt-10">
        30-day money-back guarantee on paid plans. Cancel anytime.
      </p>
    </section>
  )
}
