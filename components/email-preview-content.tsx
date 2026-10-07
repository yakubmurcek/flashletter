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
  onEditorCreated?: (editor: import('@tiptap/react').Editor) => void
}

function EmailPreviewContentComponent({
  subject,
  content,
  onSubjectChange,
  onContentChange,
  onMouseUp,
  onEditorCreated,
}: EmailPreviewContentProps) {
  return (
    <div
      className="flex-1 overflow-y-auto rounded-lg bg-card border border-border"
      onMouseUp={onMouseUp}
    >
      <div className="p-3 sm:p-6 lg:p-10">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="rounded-lg bg-background border border-border p-5 sm:p-8 lg:p-10 min-h-[500px]">
            <div className="space-y-2 mb-6 pb-6 border-b border-border">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Subject</div>
              <Input
                value={subject}
                onChange={(e) => onSubjectChange?.(e.target.value)}
                className="text-xl md:text-2xl font-semibold tracking-tight text-foreground border-none shadow-none px-0 h-auto focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/40"
                placeholder="Enter subject..."
              />
            </div>

            <RichTextEditor
              content={content}
              onChange={(newContent) => onContentChange?.(newContent)}
              className="prose-lg"
              onEditorCreated={onEditorCreated}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize to prevent re-renders when props don't change
export const EmailPreviewContent = memo(EmailPreviewContentComponent)
