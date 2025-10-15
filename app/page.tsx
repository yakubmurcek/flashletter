'use client'

import { Button } from '@/components/ui/button'
import { FAQ } from '@/components/ui/faq'
import {
  ArrowRight,
  Sparkles,
  Mail,
  Zap,
  Check,
  Play,
  Star,
  TrendingUp,
  Users,
  Clock,
  Target,
  Award,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserMenu } from '@/components/auth/user-menu'
import { FAQ_ITEMS } from '@/lib/constants/faq'
import { useEffect, useState, useRef, memo } from 'react'

// Animated components - simple CSS-based approach
const AnimatedSection = ({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) => {
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={elementRef}
      style={{ transitionDelay: `${delay}ms` }}
      className={`fade-in-section ${className}`}
    >
      {children}
    </div>
  )
}

const FloatingElement = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) => (
  <div
    className="animate-float"
    style={{
      animationDelay: `${delay}s`,
      animationDuration: '6s',
    }}
  >
    {children}
  </div>
)

const PulseButton = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div className="relative">
      <div
        className="absolute -inset-0.5 bg-primary/20 rounded-full blur-sm"
        style={{
          animation: 'pulseButton 3s ease-in-out infinite',
        }}
      ></div>
      <div
        className="relative"
        style={{
          animation: 'scaleButton 4s ease-in-out infinite',
        }}
      >
        {children}
      </div>
    </div>
  )
}

const GradientText = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => (
  <span
    className={`bg-gradient-to-r from-primary via-indigo-500 to-purple-600 bg-clip-text text-transparent animate-gradient ${className}`}
  >
    {children}
  </span>
)

export default function Home() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <header className="border-b border-border backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Mail className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold group-hover:text-primary transition-colors">
              Flashletter
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
            >
              Testimonials
            </a>
            <a
              href="#faq"
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
            >
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hover:scale-105 transition-transform"
                >
                  <Link href="/campaigns">My Campaigns</Link>
                </Button>
                <UserMenu user={user} />
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hover:scale-105 transition-transform"
                >
                  <Link href="/login">Sign In</Link>
                </Button>
                <PulseButton>
                  <Button
                    size="sm"
                    asChild
                    className="bg-gradient-to-r from-primary to-purple-600/70 hover:from-primary/90 hover:to-purple-600/60"
                  >
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </PulseButton>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center pt-10 pb-14 md:pt-16 md:pb-24">
          {/* Floating elements around hero */}
          <FloatingElement delay={0}>
            <div className="absolute top-20 left-10 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary" />
            </div>
          </FloatingElement>
          <FloatingElement delay={1}>
            <div className="absolute top-32 right-16 w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-purple-500" />
            </div>
          </FloatingElement>
          <FloatingElement delay={2}>
            <div className="absolute bottom-20 left-20 w-14 h-14 bg-pink-500/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-pink-500" />
            </div>
          </FloatingElement>

          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 text-foreground text-sm mb-6">
              <Sparkles className="w-4 h-4 animate-pulse text-yellow-500 fill-yellow-500 drop-shadow-lg" />
              <span className="font-medium">
                Lightning-fast AI Email Campaigns
              </span>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance leading-tight">
              Converting email campaigns in{' '}
              <GradientText className="cursor-behind">seconds</GradientText>{' '}
              with Flashletter
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 text-balance max-w-2xl mx-auto leading-relaxed">
              Transform your landing page into a complete email campaign. AI
              analyzes your content and creates personalized email sequences
              that convert.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <PulseButton>
                <Button
                  size="lg"
                  asChild
                  className="gap-2 text-base px-6 py-3 bg-gradient-to-r from-primary to-purple-600/70 hover:from-primary/90 hover:to-purple-600/60 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Link href="/create" prefetch={true}>
                    Start Creating
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </PulseButton>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base px-6 py-3 bg-transparent hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 group"
              >
                <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>
          </AnimatedSection>

          {/* Stats section */}
          <AnimatedSection delay={400}>
            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">10x</div>
                <div className="text-sm text-muted-foreground">
                  Faster Campaign Creation
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">45%</div>
                <div className="text-sm text-muted-foreground">
                  Higher Open Rates
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">67%</div>
                <div className="text-sm text-muted-foreground">
                  ROI Improvement
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>

        <AnimatedSection delay={400}>
          <section
            id="features"
            aria-label="Features"
            className="py-14 md:py-20"
          >
            <div className="max-w-2xl mx-auto text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                <GradientText>Powerful Features</GradientText>
              </h2>
              <p className="text-muted-foreground text-lg">
                Everything you need to ship effective email campaigns fast.
              </p>
            </div>

            <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
              <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  Lightning Fast
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Generate complete email campaigns in seconds. No more hours
                  spent writing copy.
                </p>
                <div className="mt-4 flex items-center text-sm text-primary font-medium">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>30 seconds average</span>
                </div>
              </div>

              <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  AI-Powered
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Advanced AI analyzes your landing page and creates
                  contextually relevant emails.
                </p>
                <div className="mt-4 flex items-center text-sm text-primary font-medium">
                  <Target className="w-4 h-4 mr-2" />
                  <span>95% accuracy rate</span>
                </div>
              </div>

              <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500/10 to-pink-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Mail className="w-8 h-8 text-pink-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  Fully Editable
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Customize every aspect of your emails with our intuitive
                  editor and AI assistant.
                </p>
                <div className="mt-4 flex items-center text-sm text-primary font-medium">
                  <Award className="w-4 h-4 mr-2" />
                  <span>Unlimited revisions</span>
                </div>
              </div>
            </div>

            {/* Additional features grid */}
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 mt-10">
              <div className="group bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-xl p-8 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">
                    Analytics & Insights
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  Track performance with detailed analytics and get AI-powered
                  insights to optimize your campaigns.
                </p>
              </div>

              <div className="group bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/20 rounded-xl p-8 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold">Team Collaboration</h3>
                </div>
                <p className="text-muted-foreground">
                  Work together seamlessly with real-time collaboration,
                  comments, and approval workflows.
                </p>
              </div>
            </div>
          </section>
        </AnimatedSection>

        <AnimatedSection delay={400}>
          <section id="pricing" aria-label="Pricing" className="py-14 md:py-20">
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
                  <p className="text-muted-foreground text-sm mb-4">
                    Perfect for trying things out
                  </p>
                  <div className="text-4xl font-bold mb-2">$0</div>
                  <div className="text-sm text-muted-foreground">
                    Forever free
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground mb-8 flex-1">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />3
                    campaigns/month
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

              <div className="relative bg-gradient-to-br from-primary to-purple-600 text-primary-foreground border border-primary rounded-xl overflow-hidden p-8 flex flex-col shadow-2xl md:scale-[1.05] md:-translate-y-2 z-[1] group">
                <span className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 text-sm font-medium rounded-full bg-primary-foreground text-primary shadow-lg">
                  Most Popular
                </span>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-semibold mb-2">Pro</h3>
                  <p className="text-primary-foreground/80 text-sm mb-4">
                    For growing teams and businesses
                  </p>
                  <div className="text-5xl font-bold mb-2">
                    $19
                    <span className="text-lg font-normal text-primary-foreground/80">
                      /mo
                    </span>
                  </div>
                  <div className="text-sm text-primary-foreground/80">
                    Billed monthly
                  </div>
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
                  <p className="text-muted-foreground text-sm mb-4">
                    Collaboration at scale
                  </p>
                  <div className="text-4xl font-bold mb-2">
                    $49
                    <span className="text-lg font-normal text-muted-foreground">
                      /mo
                    </span>
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
            <div className="max-w-2xl mx-auto text-center mt-10 p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20 rounded-xl">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <strong className="text-foreground">
                  30-day money-back guarantee
                </strong>{' '}
                on all paid plans. Cancel anytime. No questions asked.
              </p>
            </div>
          </section>
        </AnimatedSection>

        <AnimatedSection delay={400}>
          <section
            id="testimonials"
            aria-label="Testimonials"
            className="py-14 md:py-20"
          >
            <div className="max-w-2xl mx-auto text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                <GradientText>Loved by teams worldwide</GradientText>
              </h2>
              <p className="text-muted-foreground text-lg">
                See how Flashletter is transforming email marketing for
                companies of all sizes.
              </p>
            </div>

            <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
              <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <blockquote className="text-lg leading-relaxed mb-6 text-foreground relative">
                  <span className="absolute -top-2 -left-2 text-4xl text-primary/20 font-serif">
                    "
                  </span>
                  Flashletter cut our email campaign creation time from 3 days
                  to 30 minutes. Our open rates jumped 45% and we're finally
                  hitting our quarterly targets consistently.
                  <span className="absolute -bottom-4 -right-2 text-4xl text-primary/20 font-serif">
                    "
                  </span>
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
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

              <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <blockquote className="text-lg leading-relaxed mb-6 text-foreground relative">
                  <span className="absolute -top-2 -left-2 text-4xl text-primary/20 font-serif">
                    "
                  </span>
                  The AI perfectly captures our brand voice across all
                  campaigns. What used to take our entire marketing team a week
                  now happens in hours. ROI increased by 67% in just two months.
                  <span className="absolute -bottom-4 -right-2 text-4xl text-primary/20 font-serif">
                    "
                  </span>
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
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

              <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <blockquote className="text-lg leading-relaxed mb-6 text-foreground relative">
                  <span className="absolute -top-2 -left-2 text-4xl text-primary/20 font-serif">
                    "
                  </span>
                  The collaborative features are game-changing. Our distributed
                  team can now work on campaigns in real-time. Customer
                  engagement is up 52% since we started using Flashletter.
                  <span className="absolute -bottom-4 -right-2 text-4xl text-primary/20 font-serif">
                    "
                  </span>
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                    MC
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      Mia Chen
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Product Ops at InnovateLab
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional testimonial row */}
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 mt-10">
              <div className="group bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-8 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <blockquote className="text-lg leading-relaxed mb-6 text-foreground relative">
                  <span className="absolute -top-2 -left-2 text-4xl text-primary/20 font-serif">
                    "
                  </span>
                  As a startup, we needed to move fast without sacrificing
                  quality. Flashletter delivers professional campaigns that look
                  like they came from a Fortune 500 company. Our conversion rate
                  tripled.
                  <span className="absolute -bottom-4 -right-2 text-4xl text-primary/20 font-serif">
                    "
                  </span>
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
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

              <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <blockquote className="text-lg leading-relaxed mb-6 text-foreground relative">
                  <span className="absolute -top-2 -left-2 text-4xl text-primary/20 font-serif">
                    "
                  </span>
                  The A/B testing features helped us discover what resonates
                  with our audience. We've seen a 78% improvement in
                  click-through rates and our unsubscribe rate dropped to almost
                  zero.
                  <span className="absolute -bottom-4 -right-2 text-4xl text-primary/20 font-serif">
                    "
                  </span>
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
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
        </AnimatedSection>

        <AnimatedSection delay={400}>
          <section id="faq" aria-label="FAQ" className="py-16 md:py-24">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                <GradientText>Frequently Asked Questions</GradientText>
              </h2>
              <p className="text-muted-foreground text-lg">
                Everything you need to know about Flashletter.
              </p>
            </div>
            <div className="max-w-2xl mx-auto">
              <FAQ items={FAQ_ITEMS} />
            </div>
          </section>
        </AnimatedSection>
      </main>

      {/* Final CTA Section */}
      <AnimatedSection delay={400}>
        <section className="py-14 md:py-20 bg-gradient-to-br from-primary/5 to-purple-500/5 border-y border-primary/10 w-full">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to transform your email marketing?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of teams already using Flashletter to create
                high-converting email campaigns in seconds.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <PulseButton>
                  <Button
                    size="lg"
                    asChild
                    className="gap-2 text-base bg-gradient-to-r from-primary to-purple-600/70 hover:from-primary/90 hover:to-purple-600/60 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Link href="/signup">
                      Start Free Trial
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </PulseButton>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 text-base bg-transparent hover:bg-primary/5 hover:border-primary/50 transition-all duration-300"
                >
                  <Play className="w-4 h-4" />
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      <footer className="border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-semibold">Flashletter</span>
                <p className="text-sm text-muted-foreground">
                  AI-powered email campaigns
                </p>
              </div>
            </div>
            <nav className="flex flex-wrap items-center gap-6 text-sm">
              <a
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors hover:scale-105"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-muted-foreground hover:text-foreground transition-colors hover:scale-105"
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="text-muted-foreground hover:text-foreground transition-colors hover:scale-105"
              >
                Testimonials
              </a>
              <a
                href="#faq"
                className="text-muted-foreground hover:text-foreground transition-colors hover:scale-105"
              >
                FAQ
              </a>
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors hover:scale-105"
              >
                Sign In
              </Link>
              <PulseButton>
                <Button
                  size="sm"
                  asChild
                  className="bg-gradient-to-r from-primary to-purple-600/70 hover:from-primary/90 hover:to-purple-600/60"
                >
                  <Link href="/signup">Get Started</Link>
                </Button>
              </PulseButton>
            </nav>
          </div>
          <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-muted-foreground">
            <div>
              © {new Date().getFullYear()} Flashletter. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <a
                className="hover:text-foreground transition-colors"
                href="mailto:support@flashletter.com"
              >
                support@flashletter.com
              </a>
              <a
                className="hover:text-foreground transition-colors"
                href="/privacy"
              >
                Privacy Policy
              </a>
              <a
                className="hover:text-foreground transition-colors"
                href="/terms"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
