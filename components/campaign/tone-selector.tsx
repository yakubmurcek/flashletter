import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CAMPAIGN_TONES } from '@/lib/constants/campaign'

interface ToneSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <div className="space-y-3">
      <Label
        htmlFor="tone"
        className="text-base font-semibold"
      >
        Tone
      </Label>
      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger
          id="tone"
          className="h-12"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CAMPAIGN_TONES.map((t) => (
            <SelectItem
              key={t.value}
              value={t.value}
            >
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Choose the tone that best fits your brand voice
      </p>
    </div>
  )
}
