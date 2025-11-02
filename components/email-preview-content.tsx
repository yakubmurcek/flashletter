import { memo } from 'react'
import { renderMarkdown } from '@/lib/utils/markdown-renderer'

interface EmailPreviewContentProps {
  subject: string
  content: string
  onMouseUp?: () => void
}

function EmailPreviewContentComponent({
  subject,
  content,
  onMouseUp,
}: EmailPreviewContentProps) {
  return (
    <div
      className="flex-1 overflow-y-auto rounded-3xl bg-white/[0.03] ring-1 ring-border/10 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.85)]"
      onMouseUp={onMouseUp}
    >
      <div className="p-10">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="rounded-3xl bg-white/[0.08] p-10 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.95)]">
            <div className="text-xs text-muted-foreground/80 mb-3 uppercase tracking-[0.35em]">
              Subject
            </div>
            <div className="text-2xl font-semibold text-foreground mb-8 leading-tight">
              {subject || 'No subject'}
            </div>
            <div className="prose prose-sm max-w-none text-foreground/90">
              {renderMarkdown(content)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize to prevent re-renders when props don't change
export const EmailPreviewContent = memo(EmailPreviewContentComponent)
