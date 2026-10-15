'use client'

import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { TextSelectionPopup } from './text-selection-popup'
import { EmailPreviewContent } from './email-preview-content'
import type { Email } from '@/lib/types'

interface EmailPreviewProps {
  email: Email
  onUpdate: (updates: Partial<Email>) => void
  onTextSelected?: (text: string, action: string, meta?: { shouldFocus?: boolean }) => void
  isSaving?: boolean
  /** The last save failed; the editor page shows why. */
  saveFailed?: boolean
}

function EmailPreviewComponent({
  email,
  onUpdate,
  onTextSelected,
  isSaving = false,
  saveFailed = false,
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

  // The save still waiting out the debounce below. The editor page keys this
  // component by email id, so switching emails unmounts it: flush the pending
  // edit then instead of dropping what was typed in the last second.
  const pendingSaveRef = useRef<(() => void) | null>(null)

  // Auto-save when changes occur
  useEffect(() => {
    if (!hasChanges) {
      pendingSaveRef.current = null
      return
    }
    const save = () => {
      pendingSaveRef.current = null
      onUpdate({
        subject: editedSubject,
        content: editedContent,
      })
    }
    pendingSaveRef.current = save
    const timeoutId = setTimeout(save, 1000)

    return () => clearTimeout(timeoutId)
  }, [hasChanges, editedSubject, editedContent, onUpdate])

  useEffect(() => () => pendingSaveRef.current?.(), [])

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
      <div className="px-4 py-3 sm:px-6 sm:py-4 bg-background border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Day {email.day}</h2>
            <p className="text-sm text-muted-foreground truncate">
              {email.preview ? (
                <>
                  <span className="hidden sm:inline">Inbox preview: </span>
                  {email.preview}
                </>
              ) : (
                'Click anywhere in the email to edit it'
              )}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3 sm:gap-4">
            <span className="text-xs text-muted-foreground transition-opacity duration-300 flex items-center gap-1.5">
              {!isSaving && !saveFailed && <Check className="w-3 h-3 text-muted-foreground" />}
              {isSaving ? 'Saving...' : saveFailed ? 'Not saved' : 'Saved'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
              disabled={!editor}
            >
              {isCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy HTML'}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="w-full h-full flex flex-col min-h-0">
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
