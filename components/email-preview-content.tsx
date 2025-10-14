import { Card } from '@/components/ui/card'
import { renderMarkdown } from '@/lib/utils/markdown-renderer'

interface EmailPreviewContentProps {
  subject: string
  content: string
  onMouseUp?: () => void
}

export function EmailPreviewContent({
  subject,
  content,
  onMouseUp,
}: EmailPreviewContentProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-muted/30" onMouseUp={onMouseUp}>
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 bg-card shadow-sm">
            <div className="space-y-6">
              <div className="border-b border-border pb-4">
                <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                  Subject
                </div>
                <div className="text-xl font-semibold text-foreground">
                  {subject || 'No subject'}
                </div>
              </div>

              <div className="prose prose-sm max-w-none">
                <div className="text-foreground">{renderMarkdown(content)}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
