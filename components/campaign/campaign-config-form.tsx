import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'
import { ToneSelector } from './tone-selector'
import { CampaignTypeSelector } from './campaign-type-selector'
import { DurationSlider } from './duration-slider'
import { ConfigPreviewCard } from './config-preview-card'
import { ErrorMessage } from './error-message'

interface CampaignConfigFormProps {
  tone: string
  onToneChange: (value: string) => void
  campaignType: string
  onCampaignTypeChange: (value: string) => void
  days: number[]
  onDaysChange: (value: number[]) => void
  isGenerating: boolean
  isSubmitting: boolean
  error: string | null
  onSubmit: (e: React.FormEvent) => void
}

export function CampaignConfigForm({
  tone,
  onToneChange,
  campaignType,
  onCampaignTypeChange,
  days,
  onDaysChange,
  isGenerating,
  isSubmitting,
  error,
  onSubmit,
}: CampaignConfigFormProps) {
  const isLoading = isGenerating || isSubmitting

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <ToneSelector value={tone} onChange={onToneChange} />

      <CampaignTypeSelector
        value={campaignType}
        onChange={onCampaignTypeChange}
      />

      <DurationSlider value={days} onChange={onDaysChange} />

      <ConfigPreviewCard
        tone={tone}
        campaignType={campaignType}
        emailCount={days[0]}
      />

      {error && <ErrorMessage message={error} />}

      <Button
        type="submit"
        size="lg"
        disabled={isLoading}
        className="w-full gap-2 bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 transition-all duration-300"
      >
        {isLoading ? (
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
  )
}
