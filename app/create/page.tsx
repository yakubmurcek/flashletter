'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Link2, Loader2 } from 'lucide-react'
import { useCampaign } from '@/lib/campaign-context'
import { useLandingPage } from '@/lib/hooks/use-landing-page'
import { CampaignLayout } from '@/components/layouts/campaign-layout'
import { ProgressIndicator } from '@/components/campaign/progress-indicator'
import { FormCard } from '@/components/campaign/form-card'
import { ErrorMessage } from '@/components/campaign/error-message'
import { CAMPAIGN_STEPS } from '@/lib/constants/campaign'

export default function CreatePage() {
  const router = useRouter()
  const {
    setLandingPageData,
    createNewCampaign,
    currentCampaignId,
    saveCampaign,
    generatedEmails,
    config,
    landingPageData,
    isLoading,
  } = useCampaign()
  const { isAnalyzing, error, analyzeLandingPage } = useLandingPage()
  const [url, setUrl] = useState('')

  // Add useEffect to handle redirects based on campaign state
  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return

    // If we have generated emails, go to editor
    if (generatedEmails.length > 0 && currentCampaignId) {
      router.push(`/create/editor?campaign=${currentCampaignId}`)
      return
    }

    // If we have config but no emails, go to configure
    if (config && landingPageData && currentCampaignId) {
      router.push(`/create/configure?campaign=${currentCampaignId}`)
      return
    }

    // Otherwise, stay on this page (allow entering/re-entering URL)
  }, [
    isLoading,
    generatedEmails,
    currentCampaignId,
    config,
    landingPageData,
    router,
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    const data = await analyzeLandingPage(url)
    if (data) {
      setLandingPageData(data)
      // Create a new campaign in the database only if we don't have one
      try {
        let campaignId = currentCampaignId

        // Only create new campaign if we don't have one already
        if (!campaignId) {
          campaignId = await createNewCampaign()
        } else {
          // Update existing campaign with new landing page data
          await saveCampaign()
        }

        router.push(`/create/configure?campaign=${campaignId}`)
      } catch (error) {
        console.error('Failed to create/update campaign:', error)
        // Still proceed to configure if campaign creation fails
        router.push('/create/configure')
      }
    }
  }

  if (isLoading) {
    return null
  }

  return (
    <CampaignLayout backHref="/">
      <div className="w-full max-w-2xl">
        <ProgressIndicator currentStep={1} steps={CAMPAIGN_STEPS} />

        <FormCard
          icon={Link2}
          title="Enter your landing page URL"
          description="We'll analyze your landing page to understand your product and create targeted email campaigns."
        >
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <p className="text-sm text-muted-foreground">
                Enter the full URL including https://
              </p>
            </div>

            {error && <ErrorMessage message={error} />}

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
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
      </div>
    </CampaignLayout>
  )
}
