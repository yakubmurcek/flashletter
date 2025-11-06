import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Type, AlignLeft } from 'lucide-react'
import { MarkdownEditor } from './markdown-editor'
import { RichTextEditor } from './rich-text-editor'

interface EmailEditorSidebarProps {
  subject: string
  content: string
  editorMode: 'markdown' | 'richtext'
  onSubjectChange: (subject: string) => void
  onContentChange: (content: string) => void
  onEditorModeChange: (mode: 'markdown' | 'richtext') => void
}

export function EmailEditorSidebar({
  subject,
  content,
  editorMode,
  onSubjectChange,
  onContentChange,
  onEditorModeChange,
}: EmailEditorSidebarProps) {
  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center ring-1 ring-border/15">
            <Type className="w-4 h-4 text-primary" />
          </div>
          <Label htmlFor="subject" className="text-sm font-medium">
            Subject Line
          </Label>
        </div>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="text-base bg-white/[0.08] border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0"
          placeholder="Enter email subject..."
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center ring-1 ring-border/15">
              <AlignLeft className="w-4 h-4 text-primary" />
            </div>
            <Label htmlFor="content" className="text-sm font-medium">
              Email Content
            </Label>
          </div>
          <div className="relative">
            <Tabs
              value={editorMode}
              onValueChange={(v) =>
                onEditorModeChange(v as 'markdown' | 'richtext')
              }
            >
              <TabsList className="h-9 rounded-full bg-white/5 p-1">
                <TabsTrigger
                  value="markdown"
                  className="text-xs rounded-full data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  Markdown
                </TabsTrigger>
                <TabsTrigger
                  value="richtext"
                  className="text-xs rounded-full opacity-60"
                  disabled
                >
                  Rich Text
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-medium bg-primary/90 text-white rounded-sm rotate-12 pointer-events-none shadow-md">
              Soon
            </span>
          </div>
        </div>

        {editorMode === 'markdown' ? (
          <MarkdownEditor value={content} onChange={onContentChange} />
        ) : (
          <RichTextEditor value={content} onChange={onContentChange} />
        )}
      </div>
    </div>
  )
}
