'use client'

import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Save, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { TextSelectionPopup } from './text-selection-popup'
import { EmailEditorSidebar } from './email-editor-sidebar'
import { EmailPreviewContent } from './email-preview-content'
import { cn } from '@/lib/utils'
import type { Email } from '@/lib/types'

interface EmailPreviewProps {
  email: Email
  onUpdate: (updates: Partial<Email>) => void
  onTextSelected?: (
    text: string,
    action: string,
    meta?: { shouldFocus?: boolean }
  ) => void
  showChat?: boolean
}

function EmailPreviewComponent({
  email,
  onUpdate,
  onTextSelected,
  showChat = false,
}: EmailPreviewProps) {
  const [editedSubject, setEditedSubject] = useState(email.subject)
  const [editedContent, setEditedContent] = useState(email.content)
  const [editorMode, setEditorMode] = useState<'markdown' | 'richtext'>(
    'markdown'
  )
  const [showEditor, setShowEditor] = useState(false)
  const [selectedText, setSelectedText] = useState<string>('')
  const [popupPosition, setPopupPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const lastAutoSelectionRef = useRef<{
    text: string
    startContainer: Node
    startOffset: number
    endContainer: Node
    endOffset: number
  } | null>(null)

  // Combine both effects into one - more efficient
  useEffect(() => {
    // Reset edited content when email changes
    setEditedSubject(email.subject)
    setEditedContent(email.content)
  }, [email.id, email.subject, email.content])

  // Memoize hasChanges to avoid recalculation
  const hasChanges = useMemo(() => {
    return editedSubject !== email.subject || editedContent !== email.content
  }, [editedSubject, editedContent, email.subject, email.content])

  const handleSave = () => {
    onUpdate({
      subject: editedSubject,
      content: editedContent,
    })
  }

  const selectionsMatch = (
    range: Range | null,
    selectionDetails: {
      text: string
      startContainer: Node | null
      startOffset: number | null
      endContainer: Node | null
      endOffset: number | null
    }
  ) => {
    if (!range) return false

    const {
      startContainer,
      startOffset,
      endContainer,
      endOffset,
      text,
    } = selectionDetails

    if (!lastAutoSelectionRef.current) return false

    return (
      lastAutoSelectionRef.current.text === text &&
      lastAutoSelectionRef.current.startContainer === startContainer &&
      lastAutoSelectionRef.current.startOffset === startOffset &&
      lastAutoSelectionRef.current.endContainer === endContainer &&
      lastAutoSelectionRef.current.endOffset === endOffset
    )
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()

    if (text && text.length > 0) {
      const range =
        selection && selection.rangeCount > 0
          ? selection.getRangeAt(0)
          : null
      const rect = range?.getBoundingClientRect()

      if (rect) {
        setSelectedText(text)
        setPopupPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + window.scrollY,
        })
      }

      if (onTextSelected && range) {
        const selectionDetails = {
          text,
          startContainer: range.startContainer,
          startOffset: range.startOffset,
          endContainer: range.endContainer,
          endOffset: range.endOffset,
        }

        if (!selectionsMatch(range, selectionDetails)) {
          onTextSelected(text, 'Ask AI about this', { shouldFocus: false })
          lastAutoSelectionRef.current = selectionDetails
        }
      }
    } else {
      setSelectedText('')
      setPopupPosition(null)
      lastAutoSelectionRef.current = null
    }
  }

  const handleActionSelected = (action: string, text: string) => {
    if (action === 'Ask AI about this') {
      const selection = window.getSelection()
      const range =
        selection && selection.rangeCount > 0
          ? selection.getRangeAt(0)
          : null

      const matchesExisting = selectionsMatch(range, {
        text,
        startContainer: range ? range.startContainer : null,
        startOffset: range ? range.startOffset : null,
        endContainer: range ? range.endContainer : null,
        endOffset: range ? range.endOffset : null,
      })

      if (onTextSelected) {
        onTextSelected(text, action, { shouldFocus: true })
      }

      if (!matchesExisting && range) {
        lastAutoSelectionRef.current = {
          text,
          startContainer: range.startContainer,
          startOffset: range.startOffset,
          endContainer: range.endContainer,
          endOffset: range.endOffset,
        }
      }
    } else if (onTextSelected) {
      onTextSelected(text, action, { shouldFocus: true })
    }
    setSelectedText('')
    setPopupPosition(null)
    lastAutoSelectionRef.current = null
  }

  const handleClosePopup = () => {
    setSelectedText('')
    setPopupPosition(null)
    lastAutoSelectionRef.current = null
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 supports-[backdrop-filter]:backdrop-blur-2xl bg-white/5 ring-1 ring-border/10 rounded-b-3xl shadow-[0_18px_55px_-38px_rgba(15,23,42,0.9)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Day {email.day}
            </h2>
            <p className="text-sm text-muted-foreground/80 truncate">
              {showEditor
                ? 'Edit content on the left, see preview on the right'
                : 'Preview mode'}
            </p>
          </div>
          <div
            className={cn(
              'flex items-center gap-2',
              showChat ? 'mr-4' : 'mr-0'
            )}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditor(!showEditor)}
              className="gap-2 rounded-full border-border/40 bg-white/5 hover:bg-white/12 hover:border-border/60 transition-colors"
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
              className="gap-2 rounded-full shadow-[0_15px_45px_-25px_rgba(249,115,22,0.9)]"
            >
              <Save className="w-4 h-4" />
              {hasChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden gap-6 px-6 pb-6 pt-4">
        {showEditor && (
          <div className="flex-1 overflow-hidden transition-all duration-300">
            <div className="h-full overflow-y-auto rounded-3xl bg-white/[0.04] ring-1 ring-border/10 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.9)]">
              <EmailEditorSidebar
                subject={editedSubject}
                content={editedContent}
                editorMode={editorMode}
                onSubjectChange={setEditedSubject}
                onContentChange={setEditedContent}
                onEditorModeChange={setEditorMode}
              />
            </div>
          </div>
        )}

        <div className={cn('flex-[1.35] min-w-0 h-full')}>
          <EmailPreviewContent
            subject={editedSubject}
            content={editedContent}
            onMouseUp={handleTextSelection}
          />
        </div>
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

// Memoize to prevent re-renders when parent re-renders
export const EmailPreview = memo(EmailPreviewComponent)
