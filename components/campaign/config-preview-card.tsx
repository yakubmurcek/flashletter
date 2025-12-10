import { Card } from '@/components/ui/card'

interface ConfigPreviewCardProps {
  tone: string
  campaignType: string
  emailCount: number
}

export function ConfigPreviewCard({ tone, campaignType, emailCount }: ConfigPreviewCardProps) {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-amber-400/5 p-6 border-primary/20 hover:border-primary/30 transition-all duration-300">
      <h3 className="font-semibold mb-4 text-lg">Campaign Preview</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Tone:</span>
          <span className="font-medium capitalize bg-primary/10 px-3 py-1 rounded-full">
            {tone}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Type:</span>
          <span className="font-medium capitalize bg-primary/10 px-3 py-1 rounded-full">
            {campaignType.replace('-', ' ')}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Emails:</span>
          <span className="font-medium bg-primary/10 px-3 py-1 rounded-full">
            {emailCount} emails
          </span>
        </div>
      </div>
    </Card>
  )
}
