'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SelectedContext, FullCampaignContext, Email } from '@/lib/types'
import { MESSAGE_HISTORY_LIMIT } from '@/lib/constants/app'
import { logError, getUserFriendlyMessage } from '@/lib/utils/error-handling'
import { planLimitFromResponse } from '../billing/errors'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  appliedEdit?: boolean
  /**
   * The AI's edit, held back because the email changed while it was being
   * written. The chat shows it with an "Apply anyway" button.
   */
  proposedEdit?: EmailEdits
  /** Applies `proposedEdit` to the email it was written for. Gone once used. */
  applyProposedEdit?: () => void
  context?: {
    text: string
    action: string
  }
}

export interface EmailEdits {
  subject?: string
  content?: string
}

/** The email text a chat request was written from. */
export interface EmailBasis {
  subject: string
  content: string
}

/**
 * Applies an AI edit. With a `basis`, the receiver may refuse (return false)
 * when the email no longer matches it; without one, it applies regardless.
 */
export type ApplyEmailEdits = (edits: EmailEdits, basis?: EmailBasis) => boolean | void

function basisOf(email: { subject?: string; content?: string }): EmailBasis {
  return { subject: email.subject ?? '', content: email.content ?? '' }
}

function sameText(a: EmailBasis, b: EmailBasis): boolean {
  return a.subject === b.subject && a.content === b.content
}

interface UseAIChatParams {
  campaignContext?: FullCampaignContext
  emailContext?: {
    subject?: string
    content?: string
    campaignType?: string
  }
  selectedContext?: SelectedContext | null
  onApplyEdits?: ApplyEmailEdits
  onClearContext?: () => void
}

const GREETING_READY =
  "I've read your landing page and every email in this sequence. Ask me to sharpen a subject line, cut an email down, or change the tone. Select any text in the email to rework just that part."
const GREETING_WAITING =
  'Claude is writing your sequence. Once the first email is in, ask me to sharpen a subject line, cut an email down, or change the tone.'

function greetingFor(contextReady: boolean): string {
  return contextReady ? GREETING_READY : GREETING_WAITING
}

export function useAIChat({
  campaignContext,
  emailContext,
  selectedContext,
  onApplyEdits,
  onClearContext,
}: UseAIChatParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: greetingFor(!!campaignContext || !!emailContext),
      timestamp: new Date(),
    },
  ])
  // The greeting only claims to have read the emails once it actually has them.
  const contextReady = !!campaignContext || !!emailContext
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 1 && m.role === 'assistant' ? { ...m, content: greetingFor(contextReady) } : m,
      ),
    )
  }, [contextReady])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // The email as it is now, read when a reply lands: the request's own
  // closure only knows the text from when it was sent.
  const liveEmailRef = useRef({ emailContext, emailId: campaignContext?.currentEmailId })
  useEffect(() => {
    liveEmailRef.current = { emailContext, emailId: campaignContext?.currentEmailId }
  }, [emailContext, campaignContext?.currentEmailId])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    // Without the campaign the AI would answer blind ("paste your email").
    if (!campaignContext && !emailContext) return

    const contextForThisRequest = selectedContext
    // The reply is computed from this text. If the email changes before it
    // lands, applying it would wipe what the user typed meanwhile.
    const basis = emailContext ? basisOf(emailContext) : undefined
    const basisEmailId = campaignContext?.currentEmailId
    if (selectedContext && onClearContext) {
      onClearContext()
    }

    const userMessage: ChatMessage = {
      id: messages.length + 1,
      role: 'user',
      content: input,
      timestamp: new Date(),
      context: contextForThisRequest || undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages
            .slice(-MESSAGE_HISTORY_LIMIT)
            .map((m) => ({ role: m.role, content: m.content }))
            .concat([{ role: 'user', content: input }]),
          campaignContext,
          emailContext,
          selectedContext: contextForThisRequest,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const raw = await response.json().catch(() => null)
        const limit = planLimitFromResponse(response.status, raw)
        if (limit) {
          setMessages((prev) => [
            ...prev,
            {
              id: messages.length + 2,
              role: 'assistant',
              content: `${limit.message} See plans at /pricing.`,
              timestamp: new Date(),
            },
          ])
          return
        }
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      const aiMessageId = messages.length + 2
      let heldBack: EmailEdits | null = null
      if (data.shouldEdit && data.edits && onApplyEdits) {
        const live = liveEmailRef.current
        // Same email, different text: the user edited it while waiting. When
        // the open email is another one, the page checks the right email.
        const changedHere =
          !!basis &&
          !!live.emailContext &&
          live.emailId === basisEmailId &&
          !sameText(basis, basisOf(live.emailContext))
        if (changedHere || onApplyEdits(data.edits, basis) === false) {
          heldBack = data.edits
        }
      }

      const aiMessage: ChatMessage = {
        id: aiMessageId,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        appliedEdit: heldBack ? false : data.shouldEdit || false,
      }
      if (heldBack && onApplyEdits) {
        const edits = heldBack
        const apply = onApplyEdits
        let used = false
        aiMessage.proposedEdit = edits
        aiMessage.applyProposedEdit = () => {
          if (used) return
          used = true
          apply(edits)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId ? { ...m, appliedEdit: true, applyProposedEdit: undefined } : m,
            ),
          )
        }
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      logError(error, {
        operation: 'chat request',
        component: 'useAIChat',
        additionalData: {
          messageCount: messages.length,
          hasCampaignContext: !!campaignContext,
          hasEmailContext: !!emailContext,
        },
      })

      const errorMessage: ChatMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: getUserFriendlyMessage(error, 'process your request'),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const quickActions = useMemo(() => {
    const basicActions = [
      'Improve subject line',
      'Make it more engaging',
      'Add a strong CTA',
      'Shorten the content',
    ]

    if (!emailContext) {
      return basicActions
    }

    const discussedTopics = new Set(
      messages.filter((m) => m.role === 'user').map((m) => m.content.toLowerCase()),
    )

    const dynamicActions: string[] = []
    const { subject = '', content = '', campaignType = '' } = emailContext
    const contentLength = content.length
    const hasCtaKeywords =
      /click|buy|shop|get|download|sign up|register|join|try|start|learn more/i.test(content)
    const hasUrgency = /now|today|limited|hurry|don't miss/i.test(content)
    const hasPersonalization = /\{name\}|\{first_name\}/i.test(content)
    const subjectLength = subject.length

    if (subjectLength > 60 && !discussedTopics.has('subject') && !discussedTopics.has('shorten')) {
      dynamicActions.push('Subject line is too long')
    }

    if (!hasCtaKeywords && !discussedTopics.has('cta') && !discussedTopics.has('call to action')) {
      dynamicActions.push('Missing clear call-to-action')
    }

    if (contentLength > 1000 && !discussedTopics.has('shorten')) {
      dynamicActions.push('Content is too long')
    } else if (contentLength < 200 && !discussedTopics.has('expand')) {
      dynamicActions.push('Add more value')
    }

    if (!hasUrgency && campaignType?.toLowerCase().includes('promo')) {
      dynamicActions.push('Add urgency for promo')
    }

    if (!hasPersonalization && !discussedTopics.has('personalization')) {
      dynamicActions.push('Make it more personal')
    }

    if (campaignType?.toLowerCase().includes('welcome') && !discussedTopics.has('onboard')) {
      dynamicActions.push('Improve onboarding flow')
    }

    if (campaignType?.toLowerCase().includes('nurture') && !discussedTopics.has('value')) {
      dynamicActions.push('Add educational content')
    }

    if (!discussedTopics.has('tone') && !discussedTopics.has('voice')) {
      dynamicActions.push('Adjust tone')
    }

    const combined = [...dynamicActions.slice(0, 2), ...basicActions]

    return combined.filter((action, index, self) => self.indexOf(action) === index).slice(0, 4)
  }, [messages, emailContext])

  return {
    messages,
    input,
    setInput,
    isLoading,
    quickActions,
    handleSubmit,
  }
}

/**
 * Lets the editor page refuse an AI edit when the email it was written from
 * has changed, including typing the preview has not saved yet (it saves after
 * a pause, so the page's state can lag the screen by up to a second).
 */
export function useChatEditGuard(
  emails: Email[],
  // May be async; it reports its own save errors (useEmailAutosave), so it is not awaited.
  applyEdit: (id: number, edits: EmailEdits) => void | Promise<void>,
) {
  const emailsRef = useRef(emails)
  const applyRef = useRef(applyEdit)
  useEffect(() => {
    emailsRef.current = emails
    applyRef.current = applyEdit
  }, [emails, applyEdit])
  // What the open email's editor shows right now, saved or not.
  const draftRef = useRef<({ id: number } & EmailBasis) | null>(null)

  const reportDraft = useCallback((id: number, draft: EmailBasis) => {
    draftRef.current = { id, ...draft }
  }, [])

  const applyChatEdits = useCallback(
    (id: number, edits: EmailEdits, basis?: EmailBasis): boolean => {
      if (basis) {
        const draft = draftRef.current
        const live = draft?.id === id ? draft : emailsRef.current.find((e) => e.id === id)
        if (!live || !sameText(basis, basisOf(live))) return false
      }
      void applyRef.current(id, edits)
      return true
    },
    [],
  )

  return { reportDraft, applyChatEdits }
}
