'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Settings } from 'lucide-react'
import { AppShell } from '@/components/layouts/app-shell'
import { ProgressIndicator } from '@/components/campaign/progress-indicator'
import { FormCard } from '@/components/campaign/form-card'
import { CampaignConfigForm } from '@/components/campaign/campaign-config-form'
import { AnalysisCard } from '@/components/campaign/analysis-card'
import { useCampaignConfig } from '@/lib/hooks/use-campaign-config'
import { useCampaign } from '@/lib/campaign-context'
import { CAMPAIGN_STEPS } from '@/lib/constants/campaign'
import { isValidCampaignId } from '@/lib/utils/validation'
import type { LandingPageAnalysis } from '@/lib/schemas/analysis'

function ConfigurePageContent() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaign')
  const validCampaignId = campaignId && isValidCampaignId(campaignId) ? campaignId : null

  const {
    tone,
    setTone,
    campaignType,
    setCampaignType,
    days,
    setDays,
    landingPageData,
    isGenerating,
    isSubmitting,
    isReady,
    error,
    warning,
    handleSubmit,
  } = useCampaignConfig(validCampaignId)

  const { setLandingPageData } = useCampaign()

  if (!isReady) {
    return null
  }

  const handleAnalysisChange = (next: LandingPageAnalysis) => {
    if (!landingPageData) return
    setLandingPageData({ ...landingPageData, analysis: next })
  }

  return (
    <AppShell
      chrome="narrow"
      backHref="/create"
      headerRight={
        <div className="text-sm text-muted-foreground truncate max-w-md">
          {landingPageData?.url}
        </div>
      }
    >
      <div className="space-y-6">
        <ProgressIndicator
          currentStep={2}
          steps={CAMPAIGN_STEPS}
        />

        {landingPageData?.analysis && (
          <AnalysisCard
            analysis={landingPageData.analysis}
            onChange={handleAnalysisChange}
          />
        )}

        <FormCard
          icon={Settings}
          title="Configure your campaign"
          description="Customize the tone, type, and duration of your email campaign to match your goals."
        >
          <CampaignConfigForm
            tone={tone}
            onToneChange={setTone}
            campaignType={campaignType}
            onCampaignTypeChange={setCampaignType}
            days={days}
            onDaysChange={setDays}
            isGenerating={isGenerating}
            isSubmitting={isSubmitting}
            error={error}
            warning={warning}
            onSubmit={handleSubmit}
          />
        </FormCard>
      </div>
    </AppShell>
  )
}

export default function ConfigurePage() {
  return (
    <Suspense
      fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}
    >
      <ConfigurePageContent />
    </Suspense>
  )
}
