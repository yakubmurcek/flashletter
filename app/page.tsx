import { Button } from '@/components/ui/button'
import { FAQ } from '@/components/ui/faq'
import { ArrowRight, Sparkles, Mail, Zap, Check } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserMenu } from '@/components/auth/user-menu'
import { FAQ_ITEMS } from '@/lib/constants/faq'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">Flashletter</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Testimonials
            </a>
            <a
              href="#faq"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/campaigns">My Campaigns</Link>
                </Button>
                <UserMenu user={user} />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center pt-12 pb-16 md:pt-20 md:pb-28">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-gray-800 text-sm mb-4">
            <Sparkles className="w-4 h-4 animate-pulse text-yellow-500 fill-yellow-500 drop-shadow-lg" />
            <span>Lightning-fast AI Email Campaigns</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance leading-tight">
            Converting email campaigns in{' '}
            <span className="text-primary cursor-behind">seconds</span> with
            Flashletter
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 text-balance max-w-2xl mx-auto leading-relaxed">
            Transform your landing page into a complete email campaign. AI
            analyzes your content and creates personalized email sequences that
            convert.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="gap-2 text-base">
              <Link href="/create" prefetch={true}>
                Start Creating
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-base bg-transparent"
            >
              Watch Demo
            </Button>
          </div>
        </div>

        <section id="features" aria-label="Features" className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Features</h2>
            <p className="text-muted-foreground">
              Everything you need to ship effective email campaigns fast.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground leading-relaxed">
                Generate complete email campaigns in seconds. No more hours
                spent writing copy.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
              <p className="text-muted-foreground leading-relaxed">
                Advanced AI analyzes your landing page and creates contextually
                relevant emails.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fully Editable</h3>
              <p className="text-muted-foreground leading-relaxed">
                Customize every aspect of your emails with our intuitive editor
                and AI assistant.
              </p>
            </div>
          </div>
        </section>

        <section id="pricing" aria-label="Pricing" className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Pricing</h2>
            <p className="text-muted-foreground">
              Simple pricing. Start free and upgrade as you grow.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
              <h3 className="text-xl font-semibold">Free</h3>
              <p className="text-muted-foreground text-sm mb-4">
                For trying things out
              </p>
              <div className="text-3xl font-bold mb-4">$0</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />3 campaigns/month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Basic AI generation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Editor access
                </li>
              </ul>
              <Button variant="outline" className="mt-auto" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>

            <div className="relative bg-primary text-primary-foreground border border-primary rounded-lg p-7 md:p-8 flex flex-col shadow-md md:shadow-lg md:scale-[1.04] md:-translate-y-1 z-[1]">
              <span className="absolute -top-3 right-4 px-2.5 py-1 text-xs font-medium rounded-full bg-primary-foreground text-primary shadow">
                Most Popular
              </span>
              <h3 className="text-2xl font-semibold">Pro</h3>
              <p className="text-primary-foreground/80 text-sm mb-4">
                For growing teams
              </p>
              <div className="text-4xl font-bold mb-4">
                $19
                <span className="text-base font-normal text-primary-foreground/80">
                  /mo
                </span>
              </div>
              <ul className="space-y-2 text-sm text-primary-foreground/90 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary-foreground" />
                  Unlimited campaigns
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary-foreground" />
                  Advanced AI features
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary-foreground" />
                  Version history
                </li>
              </ul>
              <Button
                size="lg"
                variant="secondary"
                className="mt-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                asChild
              >
                <Link href="/signup">Start Pro</Link>
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
              <h3 className="text-xl font-semibold">Team</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Collaboration at scale
              </p>
              <div className="text-3xl font-bold mb-4">
                $49<span className="text-base font-normal">/mo</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Team workspaces
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Role permissions
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Priority support
                </li>
              </ul>
              <Button variant="outline" className="mt-auto" asChild>
                <Link href="/signup">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </section>

        <section
          id="testimonials"
          aria-label="Testimonials"
          className="py-16 md:py-24"
        >
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Loved by teams worldwide
            </h2>
            <p className="text-muted-foreground text-lg">
              See how Flashletter is transforming email marketing for companies
              of all sizes.
            </p>
          </div>
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition-all duration-300 hover:border-primary/20 group">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <blockquote className="text-lg leading-relaxed mb-6 text-foreground">
                "Flashletter cut our email campaign creation time from 3 days to
                30 minutes. Our open rates jumped 45% and we're finally hitting
                our quarterly targets consistently."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  AT
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Ava Thompson
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Growth Lead at TechFlow
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition-all duration-300 hover:border-primary/20 group">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <blockquote className="text-lg leading-relaxed mb-6 text-foreground">
                "The AI perfectly captures our brand voice across all campaigns.
                What used to take our entire marketing team a week now happens
                in hours. ROI increased by 67% in just two months."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  DM
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Diego Martinez
                  </div>
                  <div className="text-sm text-muted-foreground">
                    CMO at GrowthCo
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition-all duration-300 hover:border-primary/20 group">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <blockquote className="text-lg leading-relaxed mb-6 text-foreground">
                "The collaborative features are game-changing. Our distributed
                team can now work on campaigns in real-time. Customer engagement
                is up 52% since we started using Flashletter."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  MC
                </div>
                <div>
                  <div className="font-semibold text-foreground">Mia Chen</div>
                  <div className="text-sm text-muted-foreground">
                    Product Ops at InnovateLab
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional testimonial row */}
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 mt-8">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-8 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <blockquote className="text-lg leading-relaxed mb-6 text-foreground">
                "As a startup, we needed to move fast without sacrificing
                quality. Flashletter delivers professional campaigns that look
                like they came from a Fortune 500 company. Our conversion rate
                tripled."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  JS
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    James Sullivan
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Founder at StartupXYZ
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <blockquote className="text-lg leading-relaxed mb-6 text-foreground">
                "The A/B testing features helped us discover what resonates with
                our audience. We've seen a 78% improvement in click-through
                rates and our unsubscribe rate dropped to almost zero."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  RK
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Rachel Kim
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Email Marketing Manager at DataCorp
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" aria-label="FAQ" className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">FAQ</h2>
            <p className="text-muted-foreground">
              Answers to common questions.
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            <FAQ items={FAQ_ITEMS} />
          </div>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">Flashletter</span>
            </div>
            <nav className="flex flex-wrap items-center gap-4 text-sm">
              <a
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Testimonials
              </a>
              <a
                href="#faq"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                FAQ
              </a>
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Get Started
              </Link>
            </nav>
          </div>
          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-muted-foreground">
            <div>
              © {new Date().getFullYear()} Flashletter. All rights reserved.
            </div>
            <div>
              Contact:{' '}
              <a
                className="underline-offset-4 hover:underline"
                href="mailto:support@flashletter.com"
              >
                support@flashletter.com
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
