'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { SelectedContext, FullCampaignContext } from '@/lib/types'
import { MESSAGE_HISTORY_LIMIT } from '@/lib/constants/app'
import { logError, getUserFriendlyMessage } from '@/lib/utils/error-handling'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  appliedEdit?: boolean
  context?: {
    text: string
    action: string
  }
}

export interface EmailEdits {
  subject?: string
  content?: string
}

interface UseAIChatParams {
  campaignContext?: FullCampaignContext
  emailContext?: {
    subject?: string
    content?: string
    campaignType?: string
  }
  selectedContext?: SelectedContext | null
  onApplyEdits?: (edits: EmailEdits) => void
  onClearContext?: () => void
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
      content:
        "Hi! I'm your AI assistant. I can help you refine your email content, suggest improvements, or answer questions about your campaign. How can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

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

    const contextForThisRequest = selectedContext
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
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      if (data.shouldEdit && data.edits && onApplyEdits) {
        onApplyEdits(data.edits)
      }

      const aiMessage: ChatMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        appliedEdit: data.shouldEdit || false,
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
