'use client'

import type React from 'react'
import { useEffect } from 'react'
import type { SelectedContext, FullCampaignContext } from '@/lib/types'
import { useAIChat } from '@/lib/hooks'
import { AIChatHeader } from '@/components/ai-chat/header'
import { AIChatMessageList } from '@/components/ai-chat/message-list'
import { AIChatQuickActions } from '@/components/ai-chat/quick-actions'
import { AIChatInputForm } from '@/components/ai-chat/input-form'
import { AIChatErrorBoundary } from '@/components/ai-chat/error-boundary'

interface EmailEdits {
  subject?: string
  content?: string
}

interface AIChatAssistantProps {
  onClose: () => void
  campaignContext?: FullCampaignContext
  emailContext?: {
    subject?: string
    content?: string
    campaignType?: string
  }
  onApplyEdits?: (edits: EmailEdits) => void
  selectedContext?: SelectedContext | null
  onClearContext?: () => void
  autoSubmitMessage?: string | null
  onAutoSubmitComplete?: () => void
  shouldFocusInput?: boolean
  onFocusHandled?: () => void
}

export function AIChatAssistant({
  onClose,
  campaignContext,
  emailContext,
  onApplyEdits,
  selectedContext,
  onClearContext,
  autoSubmitMessage,
  onAutoSubmitComplete,
  shouldFocusInput = false,
  onFocusHandled,
}: AIChatAssistantProps) {
  const { messages, input, setInput, isLoading, quickActions, handleSubmit } =
    useAIChat({
      campaignContext,
      emailContext,
      selectedContext,
      onApplyEdits,
      onClearContext,
    })

  useEffect(() => {
    if (autoSubmitMessage && !isLoading) {
      setInput(autoSubmitMessage)
      // Trigger submit after setting input
      setTimeout(() => {
        const form = document.querySelector(
          '[data-chat-form]'
        ) as HTMLFormElement
        if (form) {
          form.requestSubmit()
        }
        onAutoSubmitComplete?.()
      }, 50)
    }
  }, [autoSubmitMessage, isLoading, onAutoSubmitComplete, setInput])
  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  return (
    <AIChatErrorBoundary>
      <div className="h-full flex flex-col">
        <AIChatHeader
          onClose={onClose}
          hasCampaignContext={!!campaignContext}
        />
        <AIChatMessageList messages={messages} isLoading={isLoading} />
        <AIChatQuickActions
          actions={quickActions}
          onSelect={handleQuickAction}
          isVisible={!isLoading}
        />
        <AIChatInputForm
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          selectedContext={selectedContext}
          onClearContext={onClearContext}
          onSubmit={handleSubmit}
          shouldFocus={shouldFocusInput}
          onFocusHandled={onFocusHandled}
        />
      </div>
    </AIChatErrorBoundary>
  )
}
