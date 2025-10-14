'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Save, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { TextSelectionPopup } from './text-selection-popup'
import { EmailEditorSidebar } from './email-editor-sidebar'
import { EmailPreviewContent } from './email-preview-content'
import type { Email } from '@/lib/types'

interface EmailPreviewProps {
  email: Email
  onUpdate: (updates: Partial<Email>) => void
  onTextSelected?: (text: string, action: string) => void
}

export function EmailPreview({
  email,
  onUpdate,
  onTextSelected,
}: EmailPreviewProps) {
  const [editedSubject, setEditedSubject] = useState(email.subject)
  const [editedContent, setEditedContent] = useState(email.content)
  const [hasChanges, setHasChanges] = useState(false)
  const [editorMode, setEditorMode] = useState<'markdown' | 'richtext'>(
    'markdown'
  )
  const [showEditor, setShowEditor] = useState(false)
  const [selectedText, setSelectedText] = useState<string>('')
  const [popupPosition, setPopupPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    const changed =
      editedSubject !== email.subject || editedContent !== email.content
    setHasChanges(changed)
  }, [editedSubject, editedContent, email.subject, email.content])

  useEffect(() => {
    setEditedSubject(email.subject)
    setEditedContent(email.content)
  }, [email.id, email.subject, email.content])

  const handleSave = () => {
    onUpdate({
      subject: editedSubject,
      content: editedContent,
    })
    setHasChanges(false)
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()

    if (text && text.length > 0) {
      const range = selection?.getRangeAt(0)
      const rect = range?.getBoundingClientRect()

      if (rect) {
        setSelectedText(text)
        setPopupPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + window.scrollY,
        })
      }
    } else {
      setSelectedText('')
      setPopupPosition(null)
    }
  }

  const handleActionSelected = (action: string, text: string) => {
    if (onTextSelected) {
      onTextSelected(text, action)
    }
    setSelectedText('')
    setPopupPosition(null)
  }

  const handleClosePopup = () => {
    setSelectedText('')
    setPopupPosition(null)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card p-4 h-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Day {email.day}</h2>
            <p className="text-sm text-muted-foreground truncate">
              {showEditor
                ? 'Edit content on the left, see preview on the right'
                : 'Preview mode - click to show editor'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditor(!showEditor)}
              className="gap-2"
            >
              {showEditor ? (
                <>
                  <PanelLeftClose className="w-4 h-4" />
                  <span className="hidden sm:inline">Hide Editor</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Show Editor</span>
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {hasChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {showEditor && (
          <div className="flex-1 border-r border-border overflow-y-auto transition-all duration-300">
            <EmailEditorSidebar
              subject={editedSubject}
              content={editedContent}
              editorMode={editorMode}
              onSubjectChange={setEditedSubject}
              onContentChange={setEditedContent}
              onEditorModeChange={setEditorMode}
            />
          </div>
        )}

        <EmailPreviewContent
          subject={editedSubject}
          content={editedContent}
          onMouseUp={handleTextSelection}
        />
      </div>

      {selectedText && popupPosition && (
        <TextSelectionPopup
          selectedText={selectedText}
          position={popupPosition}
          onAction={handleActionSelected}
          onClose={handleClosePopup}
        />
      )}
    </div>
  )
}
