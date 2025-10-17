import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { CAMPAIGN_DURATION } from '@/lib/constants/campaign'

interface DurationSliderProps {
  value: number[]
  onChange: (value: number[]) => void
}

export function DurationSlider({ value, onChange }: DurationSliderProps) {
  const days = value[0]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="days" className="text-base font-semibold">
          Campaign Duration
        </Label>
        <span className="text-2xl font-bold bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
          {days} days
        </span>
      </div>
      <Slider
        id="days"
        min={CAMPAIGN_DURATION.MIN}
        max={CAMPAIGN_DURATION.MAX}
        step={1}
        value={value}
        onValueChange={onChange}
        className="py-4"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{CAMPAIGN_DURATION.MIN} days</span>
        <span>{CAMPAIGN_DURATION.MAX} days</span>
      </div>
      <p className="text-sm text-muted-foreground">
        We&apos;ll generate {days} emails, one for each day of your campaign
      </p>
    </div>
  )
}
