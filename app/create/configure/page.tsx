'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Settings } from 'lucide-react'
import { CampaignLayout } from '@/components/layouts/campaign-layout'
import { ProgressIndicator } from '@/components/campaign/progress-indicator'
import { FormCard } from '@/components/campaign/form-card'
import { CampaignConfigForm } from '@/components/campaign/campaign-config-form'
import { useCampaignConfig } from '@/lib/hooks/use-campaign-config'
import { CAMPAIGN_STEPS } from '@/lib/constants/campaign'
import { isValidCampaignId } from '@/lib/utils/validation'

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

  if (!isReady) {
    return null
  }

  return (
    <CampaignLayout
      backHref="/create"
      headerContent={
        <div className="text-sm text-muted-foreground truncate max-w-md">
          {landingPageData?.url}
        </div>
      }
    >
      <div className="w-full max-w-2xl py-8">
        <ProgressIndicator
          currentStep={2}
          steps={CAMPAIGN_STEPS}
        />

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
    </CampaignLayout>
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
