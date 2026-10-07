import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { Reveal } from '@/components/ui/reveal'

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

// Only list what the product does today. No paid plan exists yet.
const TIERS: Tier[] = [
  {
    name: 'Early access',
    price: '$0',
    blurb: 'Free while Flashletter is in early access.',
    cta: 'Get started free',
    href: '/signup',
    features: [
      'Full email sequence from any landing page URL',
      'Rich-text editor with version history',
      'AI chat to rewrite any email or selection',
      'Send a test email to your own inbox',
      'Copy into Mailchimp, ConvertKit, Beehiiv or any ESP',
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
      <Reveal className="max-w-2xl mx-auto text-center mb-14">
        <h2 className="text-display text-3xl md:text-5xl text-foreground mb-4">
          Free while in early access.
        </h2>
        <p className="text-muted-foreground text-lg">No credit card. Paid plans will come later.</p>
      </Reveal>

      <Reveal
        delay={0.1}
        className="max-w-md mx-auto grid gap-px bg-border rounded-xl overflow-hidden border border-border"
      >
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
      </Reveal>
    </section>
  )
}
