import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CAMPAIGN_TYPES } from '@/lib/constants/campaign'

interface CampaignTypeSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function CampaignTypeSelector({ value, onChange }: CampaignTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label
        htmlFor="campaign-type"
        className="text-base font-semibold"
      >
        Campaign Type
      </Label>
      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger
          id="campaign-type"
          className="h-12 border-border/60 focus:border-primary/50 transition-colors"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CAMPAIGN_TYPES.map((t) => (
            <SelectItem
              key={t.value}
              value={t.value}
            >
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">Select the goal of your email campaign</p>
    </div>
  )
}
