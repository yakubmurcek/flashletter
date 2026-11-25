'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Link2, Loader2, Lock } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UpgradeButton } from '@/components/billing/upgrade-button'
import { PRO_PRICE_USD } from '@/lib/billing/plans'
import { useCampaign } from '@/lib/campaign-context'
import { useLandingPage } from '@/lib/hooks/use-landing-page'
import { AppShell } from '@/components/layouts/app-shell'
import { ProgressIndicator } from '@/components/campaign/progress-indicator'
import { FormCard } from '@/components/campaign/form-card'
import { ErrorMessage } from '@/components/campaign/error-message'
import { ScrapeProgressOverlay } from '@/components/campaign/scrape-progress-overlay'
import { CAMPAIGN_STEPS } from '@/lib/constants/campaign'
import { useAnonymousLimit } from '@/lib/hooks/use-anonymous-limit'
import { UpgradePrompt } from '@/components/auth/upgrade-prompt'
import { track } from '@/lib/analytics'

export default function CreatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setLandingPageData, createNewCampaign, isLoading, clearAll } = useCampaign()
  const { isAnalyzing, progressState, error, analyzeLandingPage, clearError } = useLandingPage()
  const {
    isLoading: isCheckingLimit,
    isAnonymous,
    canCreate,
    campaignCount,
    campaignLimit,
  } = useAnonymousLimit()
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount
  useEffect(() => {
    clearAll()
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount
  useEffect(() => {
    const err = searchParams.get('authError')
    if (err) {
      setAuthError(err)
      const next = new URLSearchParams(searchParams.toString())
      next.delete('authError')
      const qs = next.toString()
      router.replace(qs ? `/create?${qs}` : '/create', { scroll: false })
    }
  }, [])

  const outOfCampaigns = !isLoading && !isCheckingLimit && !canCreate
  useEffect(() => {
    if (!outOfCampaigns) return
    track('limit_reached', {
      plan: isAnonymous ? 'guest' : 'free',
      limit: 'campaigns',
      surface: 'create',
    })
  }, [outOfCampaigns, isAnonymous])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setIsSubmitting(true)
    setSubmitError(null)
    let navigating = false
    try {
      // Returns null on every failure (error response, stream error, abort);
      // the hook surfaces the message through `error`.
      const data = await analyzeLandingPage(url)
      if (data) {
        setLandingPageData(data)
        navigating = true
        try {
          const campaignId = await createNewCampaign(data)
          router.push(`/create/configure?campaign=${campaignId}`)
        } catch (error) {
          console.error('Failed to create campaign:', error)
          router.push('/create/configure')
        }
      }
    } catch (error) {
      console.error('Failed to analyze landing page:', error)
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      // Keep the button busy only while we navigate away; any failure must
      // leave it clickable so the visitor can fix the URL and retry.
      if (!navigating) setIsSubmitting(false)
    }
  }

  const shownError = error ?? submitError

  // Show loading while checking anonymous limit
  if (isLoading || isCheckingLimit) {
    return null
  }

  // Show upgrade prompt if anonymous user has hit their limit
  if (isAnonymous && !canCreate) {
    return (
      <AppShell
        chrome="centered"
        backHref="/"
      >
        <UpgradePrompt
          campaignCount={campaignCount}
          initialError={authError}
        />
      </AppShell>
    )
  }

  // Signed-in user out of campaigns this month: say so before they wait for a scrape.
  if (!isAnonymous && !canCreate) {
    return (
      <AppShell
        chrome="centered"
        backHref="/campaigns"
      >
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-display text-2xl">
              <h1>You&rsquo;ve used this month&rsquo;s campaigns</h1>
            </CardTitle>
            <CardDescription>
              You&rsquo;ve used all {campaignLimit} campaigns the Free plan includes this month. Pro
              removes the limit and writes up to 30 emails per sequence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <UpgradeButton
              interval="month"
              className="w-full"
            >
              Upgrade to Pro · ${PRO_PRICE_USD.month}/mo
            </UpgradeButton>
            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <Link href="/campaigns">Back to my campaigns</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell
      chrome="narrow"
      backHref="/"
    >
      <ProgressIndicator
        currentStep={1}
        steps={CAMPAIGN_STEPS}
      />

      <ScrapeProgressOverlay
        isOpen={isAnalyzing}
        progressState={progressState}
      />

      <FormCard
        icon={Link2}
        title="Enter your landing page URL"
        description="We'll analyze your landing page to understand your product and create targeted email campaigns."
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="url">Landing page URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/landing-page"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (error) clearError()
                setSubmitError(null)
              }}
              className="h-12 text-base"
              required
            />
            <p className="text-sm text-muted-foreground">Enter the full URL including https://</p>
          </div>

          {shownError && <ErrorMessage message={shownError} />}

          <Button
            type="submit"
            size="lg"
            disabled={isAnalyzing || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isAnalyzing || isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Page...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </FormCard>
    </AppShell>
  )
}
