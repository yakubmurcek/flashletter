import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import Link from 'next/link'
import { CAMPAIGN_DURATION } from '@/lib/constants/campaign'

interface DurationSliderProps {
  value: number[]
  onChange: (value: number[]) => void
  /** Plan limit; defaults to the absolute maximum. */
  max?: number
}

export function DurationSlider({
  value,
  onChange,
  max = CAMPAIGN_DURATION.MAX,
}: DurationSliderProps) {
  const days = value[0]
  const limited = max < CAMPAIGN_DURATION.MAX

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label
          htmlFor="days"
          className="text-base font-semibold"
        >
          Number of emails
        </Label>
        <span className="text-2xl font-semibold text-primary tabular">{days} emails</span>
      </div>
      <Slider
        id="days"
        min={CAMPAIGN_DURATION.MIN}
        max={max}
        step={1}
        value={value}
        onValueChange={onChange}
        className="py-4"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{CAMPAIGN_DURATION.MIN}</span>
        <span>{max}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        One email per day of your campaign.
        {limited && (
          <>
            {' '}
            Up to {max} on your plan.{' '}
            <Link
              href="/pricing"
              className="text-primary underline underline-offset-2"
            >
              Pro writes up to {CAMPAIGN_DURATION.MAX}
            </Link>
            .
          </>
        )}
      </p>
    </div>
  )
}
