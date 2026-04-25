'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Link2, Loader2 } from 'lucide-react'
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

export default function CreatePage() {
  const router = useRouter()
  const { setLandingPageData, createNewCampaign, isLoading, clearAll } = useCampaign()
  const { isAnalyzing, progressState, error, analyzeLandingPage } = useLandingPage()
  const { isLoading: isCheckingLimit, isAnonymous, canCreate, campaignCount } = useAnonymousLimit()
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    clearAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setIsSubmitting(true)
    try {
      const data = await analyzeLandingPage(url)
      if (data) {
        setLandingPageData(data)
        try {
          const campaignId = await createNewCampaign(data)
          router.push(`/create/configure?campaign=${campaignId}`)
        } catch (error) {
          console.error('Failed to create campaign:', error)
          router.push('/create/configure')
        }
      }
    } finally {
      // Navigation replaces page; skip resetting local loading flag
    }
  }

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
        <UpgradePrompt campaignCount={campaignCount} />
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
            <Label htmlFor="url">Landing Page URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/landing-page"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-12 text-base"
              required
            />
            <p className="text-sm text-muted-foreground">Enter the full URL including https://</p>
          </div>

          {error && <ErrorMessage message={error} />}

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
