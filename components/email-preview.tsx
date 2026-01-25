'use client'

import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { TextSelectionPopup } from './text-selection-popup'
import { EmailPreviewContent } from './email-preview-content'
import { cn } from '@/lib/utils'
import type { Email } from '@/lib/types'

interface EmailPreviewProps {
  email: Email
  onUpdate: (updates: Partial<Email>) => void
  onTextSelected?: (text: string, action: string, meta?: { shouldFocus?: boolean }) => void
  showChat?: boolean
  isSaving?: boolean
}

// ... imports will be handled in separate call or combined if I use multi-replace. I'll use replace_file_content for the main body first or do imports and body together.
// Let's do imports and body separately to be safe with line numbers, or I can replace the whole file content block if I am careful.
// I will reuse "EmailPreviewComponent" signature and update its body.

function EmailPreviewComponent({
  email,
  onUpdate,
  onTextSelected,
  showChat = false,
  isSaving = false,
}: EmailPreviewProps) {
  const [editedSubject, setEditedSubject] = useState(email.subject || '')
  const [editedContent, setEditedContent] = useState(email.content || '')
  const [selectedText, setSelectedText] = useState<string>('')
  const [popupPosition, setPopupPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  const [editor, setEditor] = useState<import('@tiptap/react').Editor | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const lastAutoSelectionRef = useRef<{
    text: string
    startContainer: Node
    startOffset: number
    endContainer: Node
    endOffset: number
  } | null>(null)

  // Update local state when prop changes
  useEffect(() => {
    setEditedSubject(email.subject || '')
    setEditedContent(email.content || '')
  }, [email.id, email.subject, email.content])

  // Memoize hasChanges to avoid recalculation
  const hasChanges = useMemo(() => {
    return editedSubject !== email.subject || editedContent !== email.content
  }, [editedSubject, editedContent, email.subject, email.content])

  // Auto-save when changes occur
  useEffect(() => {
    if (hasChanges) {
      const timeoutId = setTimeout(() => {
        onUpdate({
          subject: editedSubject,
          content: editedContent,
        })
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [hasChanges, editedSubject, editedContent, onUpdate])

  const selectionsMatch = (
    range: Range | null,
    selectionDetails: {
      text: string
      startContainer: Node | null
      startOffset: number | null
      endContainer: Node | null
      endOffset: number | null
    },
  ) => {
    if (!range) return false

    const { startContainer, startOffset, endContainer, endOffset, text } = selectionDetails

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
      const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
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
      const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

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

  const handleCopy = () => {
    if (!editor) return

    const html = editor.getHTML()
    navigator.clipboard.writeText(html)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 supports-[backdrop-filter]:backdrop-blur-2xl bg-white/5 ring-1 ring-border/10 rounded-b-3xl shadow-[0_18px_55px_-38px_rgba(15,23,42,0.4)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Day {email.day}</h2>
            <p className="text-sm text-muted-foreground/80 truncate">
              Review and edit your campaign email
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground transition-opacity duration-300 flex items-center gap-1.5">
              {!isSaving && <Check className="w-3 h-3 text-muted-foreground" />}
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
              disabled={!editor}
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy HTML
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6 pt-4 min-h-0 flex flex-col items-center">
        <div className="w-full max-w-4xl h-full flex flex-col min-h-0">
          <EmailPreviewContent
            subject={editedSubject}
            content={editedContent}
            onSubjectChange={setEditedSubject}
            onContentChange={setEditedContent}
            onMouseUp={handleTextSelection}
            onEditorCreated={setEditor}
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
