import { memo } from 'react'
import dynamic from 'next/dynamic'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

const RichTextEditor = dynamic(
  () => import('@/components/editor/rich-text-editor').then((mod) => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] w-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading editor...
      </div>
    ),
  },
)

interface EmailPreviewContentProps {
  subject: string
  content: string
  onSubjectChange?: (subject: string) => void
  onContentChange?: (content: string) => void
  onMouseUp?: () => void
}

function EmailPreviewContentComponent({
  subject,
  content,
  onSubjectChange,
  onContentChange,
  onMouseUp,
}: EmailPreviewContentProps) {
  return (
    <div
      className="flex-1 overflow-y-auto rounded-3xl bg-white/[0.03] ring-1 ring-border/10 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.4)]"
      onMouseUp={onMouseUp}
    >
      <div className="p-10">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="rounded-3xl bg-white/[0.08] p-10 min-h-[500px]">
            <div className="space-y-2 mb-8">
              <div className="text-xs text-muted-foreground/80 uppercase tracking-[0.35em]">
                Subject
              </div>
              <Input
                value={subject}
                onChange={(e) => onSubjectChange?.(e.target.value)}
                className="text-2xl font-semibold text-foreground border-none px-0 h-auto focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/40"
                placeholder="Enter subject..."
              />
            </div>

            <RichTextEditor
              content={content}
              onChange={(newContent) => onContentChange?.(newContent)}
              className="prose-lg"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize to prevent re-renders when props don't change
export const EmailPreviewContent = memo(EmailPreviewContentComponent)
