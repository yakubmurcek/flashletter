'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Play, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { AnimatedSection, GradientText, FloatingElement } from '@/components/ui/animations'
import { createClient, signInAnonymously } from '@/lib/supabase/client'
import { useLandingPage } from '@/lib/hooks/use-landing-page'
import { useCampaign } from '@/lib/campaign-context'

function HeroUrlForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  const { analyzeLandingPage, isAnalyzing, error: analyzeError } = useLandingPage()
  const { setLandingPageData, createNewCampaign, clearAll } = useCampaign()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [])

  // Clear campaign context when form mounts (fresh start)
  useEffect(() => {
    clearAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    // Normalize URL: add https:// if missing
    let finalUrl = trimmedUrl
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Step 1: Ensure user is authenticated (anonymously if needed)
      if (!isAuthenticated) {
        await signInAnonymously()
        setIsAuthenticated(true)
      }

      // Step 2: Analyze the landing page
      const data = await analyzeLandingPage(finalUrl)
      if (!data) {
        // Error is set by useLandingPage hook
        setIsSubmitting(false)
        return
      }

      // Step 3: Set landing page data and create campaign
      setLandingPageData(data)
      const campaignId = await createNewCampaign(data)

      // Step 4: Navigate to configure page
      router.push(`/create/configure?campaign=${campaignId}`)
    } catch (err) {
      console.error('Failed to start campaign:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  const isLoading = isSubmitting || isAnalyzing
  const displayError = error || analyzeError

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          type="text"
          placeholder="https://your-landing-page.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12 text-base flex-1 border-border/60 focus:border-primary bg-background/80 backdrop-blur-sm"
          required
          autoFocus
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="lg"
          disabled={isLoading || isAuthenticated === null}
          className="bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 text-white px-6 h-12 text-base font-semibold transition-transform duration-300 whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              Generate My Campaign
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
      {displayError && <p className="text-sm text-destructive mt-2 text-center">{displayError}</p>}
      <p className="text-sm text-muted-foreground mt-3 text-center">
        No sign up required — try it free
      </p>
    </form>
  )
}

export function FullProductHeroSection() {
  return (
    <div className="relative text-center py-20 md:py-32">
      {/* Floating elements */}
      <FloatingElement
        delay={0}
        className="absolute pointer-events-none top-20 left-10"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-amber-400/20 rounded-full blur-xl"></div>
      </FloatingElement>

      <FloatingElement
        delay={1000}
        className="absolute pointer-events-none top-40 right-20"
      >
        <div className="w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-xl"></div>
      </FloatingElement>

      <FloatingElement
        delay={2000}
        className="absolute pointer-events-none bottom-20 left-1/3"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-full blur-xl"></div>
      </FloatingElement>

      <AnimatedSection
        delay={250}
        immediate
      >
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            For founders who hate writing from scratch
          </span>
        </div>
      </AnimatedSection>

      <AnimatedSection
        delay={250}
        immediate
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.2]">
          Turn your landing page into a{' '}
          <GradientText className="cursor-behind">
            full newsletter campaign in 30 seconds
          </GradientText>
        </h1>
      </AnimatedSection>

      <AnimatedSection
        delay={500}
        immediate
      >
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Stop staring at a blank editor. Start from a ready‑to‑send sequence you just tweak.
        </p>
      </AnimatedSection>

      {/* URL Input Form */}
      <AnimatedSection
        delay={750}
        immediate
      >
        <div className="mb-8">
          <HeroUrlForm />
        </div>
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            className="px-8 py-3 text-lg font-semibold border-border/60 hover:border-primary/50"
            asChild
          >
            <Link
              href="#demo"
              className="flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Watch Demo
            </Link>
          </Button>
        </div>
      </AnimatedSection>

      {/* Stats section */}
      <AnimatedSection
        delay={1000}
        immediate
      >
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">10x</div>
            <div className="text-sm text-muted-foreground">Faster Campaign Creation</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">25%</div>
            <div className="text-sm text-muted-foreground">Higher Open Rates</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">65%</div>
            <div className="text-sm text-muted-foreground">ROI Improvement</div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  )
}
