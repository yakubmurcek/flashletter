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
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Type className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="subject" className="text-sm font-medium">
            Subject Line
          </Label>
        </div>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="text-base bg-card border-border"
          placeholder="Enter email subject..."
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-muted-foreground" />
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
              <TabsList className="h-8">
                <TabsTrigger value="markdown" className="text-xs">
                  Markdown
                </TabsTrigger>
                <TabsTrigger value="richtext" className="text-xs" disabled>
                  Rich Text
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-medium bg-primary/90 text-white rounded-sm rotate-12 pointer-events-none shadow-sm">
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
