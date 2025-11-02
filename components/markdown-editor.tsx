import { Textarea } from '@/components/ui/textarea'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  return (
    <>
      <Textarea
        id="content"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[600px] font-mono text-sm leading-relaxed resize-none rounded-3xl bg-white/[0.06] border-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0"
        placeholder="Write your email content here using markdown...

# Heading 1
## Heading 2
### Heading 3

**Bold text**

• Bullet point 1
• Bullet point 2

Regular paragraph text..."
      />
      <p className="text-xs text-muted-foreground mt-2">
        Tip: Use **bold**, # for headings, and • for bullet points
      </p>
    </>
  )
}
