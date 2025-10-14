import { Card } from '@/components/ui/card'

interface ConfigPreviewCardProps {
  tone: string
  campaignType: string
  emailCount: number
}

export function ConfigPreviewCard({
  tone,
  campaignType,
  emailCount,
}: ConfigPreviewCardProps) {
  return (
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
          <span className="font-medium">{emailCount} emails</span>
        </div>
      </div>
    </Card>
  )
}
