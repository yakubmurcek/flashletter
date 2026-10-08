import { memo, useLayoutEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
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

/** Subject line that wraps onto more lines instead of scrolling sideways. */
function SubjectField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    fit()
    // Width changes (rotation, chat panel opening) change how many lines it needs.
    if (typeof ResizeObserver === 'undefined') return
    let lastWidth = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return
      lastWidth = el.clientWidth
      fit()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => {
        // A subject is one line; Enter must not add a stray space.
        if (e.key === 'Enter') e.preventDefault()
      }}
      aria-label="Subject"
      placeholder="Enter subject..."
      className="block w-full resize-none overflow-hidden bg-transparent text-xl md:text-2xl font-semibold leading-snug tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
    />
  )
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
      className="flex-1 overflow-y-auto bg-muted/50"
      onMouseUp={onMouseUp}
    >
      {/* One email "sheet" on a tinted canvas, sized like an inbox reading pane. */}
      <div className="px-3 py-4 sm:px-6 sm:py-8">
        <div className="max-w-2xl mx-auto rounded-xl bg-background border border-border shadow-sm px-5 py-6 sm:px-10 sm:py-9 min-h-[480px]">
          <div className="space-y-1.5 mb-6 pb-5 border-b border-border">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Subject</div>
            <SubjectField
              value={subject}
              onChange={(value) => onSubjectChange?.(value)}
            />
          </div>

          <RichTextEditor
            content={content}
            onChange={(newContent) => onContentChange?.(newContent)}
            className="text-[16px] leading-[1.7] prose-p:my-4"
            onEditorCreated={onEditorCreated}
          />
        </div>
      </div>
    </div>
  )
}

// Memoize to prevent re-renders when props don't change
export const EmailPreviewContent = memo(EmailPreviewContentComponent)
