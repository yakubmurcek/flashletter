'use client'

import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, Type } from 'lucide-react'
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
  /** What the editor shows right now, before the autosave catches up. */
  onDraftChange?: (draft: { subject: string; content: string }) => void
}

type CopyState = 'idle' | 'copied' | 'failed'

/** Preview text is plain text going into HTML. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * The email as HTML for pasting into Gmail, Outlook or an ESP. The preview
 * text rides along as a hidden preheader, which inboxes show after the subject.
 */
function emailHtml(bodyHtml: string, preview: string | undefined): string {
  const text = preview?.trim()
  if (!text) return bodyHtml
  return `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(text)}</div>${bodyHtml}`
}

/**
 * Rich copy: rich editors paste the rendered email, code and HTML blocks get
 * the source. Falls back to plain text where rich copy is missing or refused.
 */
async function copyHtml(html: string): Promise<void> {
  const clipboard = navigator.clipboard
  if (typeof ClipboardItem !== 'undefined' && clipboard?.write) {
    try {
      // No await before this call: Safari drops the click's permission.
      await clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([html], { type: 'text/plain' }),
        }),
      ])
      return
    } catch {
      // Fall through to plain text.
    }
  }
  if (!clipboard?.writeText) throw new Error('Clipboard unavailable')
  await clipboard.writeText(html)
}

function EmailPreviewComponent({
  email,
  onUpdate,
  onTextSelected,
  isSaving = false,
  saveFailed = false,
  onDraftChange,
}: EmailPreviewProps) {
  const [editedSubject, setEditedSubject] = useState(email.subject || '')
  const [editedContent, setEditedContent] = useState(email.content || '')
  const [selectedText, setSelectedText] = useState<string>('')
  const [popupPosition, setPopupPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  const [editor, setEditor] = useState<import('@tiptap/react').Editor | null>(null)
  const [htmlCopy, setHtmlCopy] = useState<CopyState>('idle')
  const [subjectCopy, setSubjectCopy] = useState<CopyState>('idle')
  const copyTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => copyTimersRef.current.forEach(clearTimeout), [])

  const lastAutoSelectionRef = useRef<{
    text: string
    startContainer: Node
    startOffset: number
    endContainer: Node
    endOffset: number
  } | null>(null)

  // An outside change (an AI edit, a restore) resyncs only the field it
  // changed: a body-only AI edit must not throw away a subject typed but not
  // saved yet, and the other way round. Adjusted during render so the
  // autosave below never sees the old value next to the new prop. The page
  // keys this component by email id, so another email remounts it.
  const [syncedSubject, setSyncedSubject] = useState(email.subject)
  const [syncedContent, setSyncedContent] = useState(email.content)
  if (email.subject !== syncedSubject) {
    setSyncedSubject(email.subject)
    setEditedSubject(email.subject || '')
  }
  if (email.content !== syncedContent) {
    setSyncedContent(email.content)
    setEditedContent(email.content || '')
  }

  useEffect(() => {
    onDraftChange?.({ subject: editedSubject, content: editedContent })
  }, [editedSubject, editedContent, onDraftChange])

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

  // Closing or hiding the tab: hand the pending edit to autosave right away.
  // Registered before the page's autosave listeners (child effects run
  // first), so autosave sees it in the same event.
  useEffect(() => {
    const flush = () => pendingSaveRef.current?.()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const showSaving = isSaving || hasChanges

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

  const showCopyState = (set: (s: CopyState) => void, state: CopyState) => {
    set(state)
    copyTimersRef.current.push(setTimeout(() => set('idle'), 2000))
  }

  const handleCopy = async () => {
    if (!editor) return
    try {
      await copyHtml(emailHtml(editor.getHTML(), email.preview))
      showCopyState(setHtmlCopy, 'copied')
    } catch {
      showCopyState(setHtmlCopy, 'failed')
    }
  }

  const handleCopySubject = async () => {
    try {
      await navigator.clipboard.writeText(editedSubject)
      showCopyState(setSubjectCopy, 'copied')
    } catch {
      showCopyState(setSubjectCopy, 'failed')
    }
  }

  const copyLabel = (state: CopyState, idle: string) =>
    state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : idle

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
              {!showSaving && !saveFailed && <Check className="w-3 h-3 text-muted-foreground" />}
              {/* A failed save stays "Not saved" while it retries, until one works. */}
              {saveFailed ? 'Not saved' : showSaving ? 'Saving...' : 'Saved'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySubject}
              className="gap-2"
              title="Copy subject"
            >
              {subjectCopy === 'copied' ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Type className="h-4 w-4" />
              )}
              <span className={subjectCopy === 'failed' ? undefined : 'hidden sm:inline'}>
                {copyLabel(subjectCopy, 'Copy subject')}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
              disabled={!editor}
              title="Copy HTML"
            >
              {htmlCopy === 'copied' ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className={htmlCopy === 'failed' ? undefined : 'hidden sm:inline'}>
                {copyLabel(htmlCopy, 'Copy HTML')}
              </span>
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
