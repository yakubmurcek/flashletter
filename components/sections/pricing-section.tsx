import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { AnimatedSection, GradientText, PulseButton } from '@/components/ui/animations'

export function PricingSection() {
  return (
    <AnimatedSection delay={250}>
      <section
        id="pricing"
        aria-label="Pricing"
        className="py-14 md:py-20"
      >
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            <GradientText>Simple Pricing</GradientText>
          </h2>
          <p className="text-muted-foreground text-lg">
            Start free and upgrade as you grow. No hidden fees.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="group bg-card border border-border rounded-xl p-8 flex flex-col hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold mb-2">Free</h3>
              <p className="text-muted-foreground text-sm mb-4">Perfect for trying things out</p>
              <div className="text-4xl font-bold mb-2">$0</div>
              <div className="text-sm text-muted-foreground">Forever free</div>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground mb-8 flex-1">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />3 campaigns/month
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                Basic AI generation
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                Editor access
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                Community support
              </li>
            </ul>
            <Button
              variant="outline"
              className="mt-auto group-hover:border-primary group-hover:text-primary transition-all"
              asChild
            >
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>

          <div className="relative bg-gradient-to-br from-orange-400 to-amber-300 text-primary-foreground border border-primary rounded-xl overflow-visible p-8 flex flex-col shadow-2xl md:scale-[1.05] md:-translate-y-2 z-[1] group">
            <span className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 text-sm font-medium rounded-full bg-primary-foreground text-primary shadow-lg z-10">
              Most Popular
            </span>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold mb-2">Pro</h3>
              <p className="text-primary-foreground/80 text-sm mb-4">
                For growing teams and businesses
              </p>
              <div className="text-5xl font-bold mb-2">
                $19
                <span className="text-lg font-normal text-primary-foreground/80">/mo</span>
              </div>
              <div className="text-sm text-primary-foreground/80">Billed monthly</div>
            </div>
            <ul className="space-y-3 text-sm text-primary-foreground/90 mb-8 flex-1">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary-foreground flex-shrink-0" />
                Unlimited campaigns
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary-foreground flex-shrink-0" />
                Advanced AI features
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary-foreground flex-shrink-0" />
                Version history
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary-foreground flex-shrink-0" />
                Analytics & insights
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary-foreground flex-shrink-0" />
                Priority support
              </li>
            </ul>
            <PulseButton>
              <Button
                size="lg"
                variant="secondary"
                className="mt-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg"
                asChild
              >
                <Link href="/signup">Start Pro Trial</Link>
              </Button>
            </PulseButton>
          </div>

          <div className="group bg-card border border-border rounded-xl p-8 flex flex-col hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold mb-2">Team</h3>
              <p className="text-muted-foreground text-sm mb-4">Collaboration at scale</p>
              <div className="text-4xl font-bold mb-2">
                $49
                <span className="text-lg font-normal text-muted-foreground">/mo</span>
              </div>
              <div className="text-sm text-muted-foreground">Per team</div>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground mb-8 flex-1">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                Everything in Pro
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                Team workspaces
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                Role permissions
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                Advanced analytics
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                Dedicated support
              </li>
            </ul>
            <Button
              variant="outline"
              className="mt-auto group-hover:border-primary group-hover:text-primary transition-all"
              asChild
            >
              <Link href="/signup">Contact Sales</Link>
            </Button>
          </div>
        </div>

        {/* Pricing note */}
        <div className="max-w-2xl mx-auto text-center mt-10 p-6 bg-gradient-to-r from-primary/5 to-amber-400/5 border border-primary/20 rounded-xl">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>
              <strong className="text-foreground">30-day money-back guarantee</strong> on all paid
              plans. Cancel anytime. No questions asked.
            </span>
          </p>
        </div>
      </section>
    </AnimatedSection>
  )
}
