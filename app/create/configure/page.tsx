'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ArrowRight, Settings, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useCampaign } from '@/lib/campaign-context'
import { useEmailGeneration } from '@/lib/hooks/use-email-generation'
import { CampaignLayout } from '@/components/layouts/campaign-layout'
import { ProgressIndicator } from '@/components/campaign/progress-indicator'
import { FormCard } from '@/components/campaign/form-card'
import { ErrorMessage } from '@/components/campaign/error-message'
import {
  CAMPAIGN_STEPS,
  CAMPAIGN_TONES,
  CAMPAIGN_TYPES,
  CAMPAIGN_DURATION,
} from '@/lib/constants/campaign'

export default function ConfigurePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaign')
  const {
    landingPageData,
    setConfig,
    setGeneratedEmails,
    isLoading,
    currentCampaignId,
    updateCampaignConfig,
    generatedEmails,
    loadCampaign,
  } = useCampaign()
  const { isGenerating, error, generateEmails } = useEmailGeneration()
  const [tone, setTone] = useState<string>(CAMPAIGN_TONES[0].value)
  const [campaignType, setCampaignType] = useState<string>(
    CAMPAIGN_TYPES[0].value
  )
  const [days, setDays] = useState<number[]>([CAMPAIGN_DURATION.DEFAULT])
  const [campaignLoaded, setCampaignLoaded] = useState(false)

  // Load campaign from database if campaignId is in URL
  useEffect(() => {
    if (campaignId && !campaignLoaded && !isLoading) {
      loadCampaign(campaignId)
        .then(() => setCampaignLoaded(true))
        .catch((error) => {
          console.error('Failed to load campaign:', error)
          router.push('/campaigns')
        })
    }
  }, [campaignId, campaignLoaded, isLoading, loadCampaign, router])

  useEffect(() => {
    // Don't redirect while still loading from storage
    if (isLoading) return

    // If we're loading a campaign from URL, wait for it to complete
    if (campaignId && !campaignLoaded) return

    if (!landingPageData) {
      router.push('/create')
      return
    }

    // If campaign already has generated emails, redirect to editor
    // User shouldn't be able to reconfigure once emails are generated
    if (generatedEmails.length > 0 && currentCampaignId) {
      router.push(`/create/editor?campaign=${currentCampaignId}&email=1`)
    }
  }, [
    landingPageData,
    router,
    isLoading,
    generatedEmails,
    currentCampaignId,
    campaignId,
    campaignLoaded,
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!landingPageData) return

    const config = { tone, campaignType, days: days[0] }

    // Update campaign config in database
    await updateCampaignConfig(config)

    const emails = await generateEmails(
      landingPageData.url,
      landingPageData.content || '',
      config,
      currentCampaignId || undefined
    )

    if (emails) {
      setConfig(config)
      setGeneratedEmails(emails)
      const editorUrl = currentCampaignId
        ? `/create/editor?campaign=${currentCampaignId}`
        : '/create/editor'
      router.push(editorUrl)
    }
  }

  if (isLoading || (campaignId && !campaignLoaded) || !landingPageData) {
    return null
  }

  return (
    <CampaignLayout
      backHref="/create"
      headerContent={
        <div className="text-sm text-muted-foreground truncate max-w-md">
          {landingPageData.url}
        </div>
      }
    >
      <div className="w-full max-w-2xl py-8">
        <ProgressIndicator currentStep={2} steps={CAMPAIGN_STEPS} />

        <FormCard
          icon={Settings}
          title="Configure your campaign"
          description="Customize the tone, type, and duration of your email campaign to match your goals."
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="tone" className="text-base">
                Campaign Tone
              </Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose the tone that best fits your brand voice
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="campaign-type" className="text-base">
                Campaign Type
              </Label>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger id="campaign-type" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select the goal of your email campaign
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="days" className="text-base">
                  Campaign Duration
                </Label>
                <span className="text-2xl font-bold text-primary">
                  {days[0]} days
                </span>
              </div>
              <Slider
                id="days"
                min={CAMPAIGN_DURATION.MIN}
                max={CAMPAIGN_DURATION.MAX}
                step={1}
                value={days}
                onValueChange={setDays}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{CAMPAIGN_DURATION.MIN} days</span>
                <span>{CAMPAIGN_DURATION.MAX} days</span>
              </div>
              <p className="text-sm text-muted-foreground">
                We'll generate {days[0]} emails, one for each day of your
                campaign
              </p>
            </div>

            <Card className="bg-muted/50 p-6 border-border">
              <h3 className="font-semibold mb-3">Campaign Preview</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tone:</span>
                  <span className="font-medium capitalize">{tone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">
                    {campaignType.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Emails:</span>
                  <span className="font-medium">{days[0]} emails</span>
                </div>
              </div>
            </Card>

            {error && <ErrorMessage message={error} />}

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Campaign with AI...
                </>
              ) : (
                <>
                  Generate Campaign
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
