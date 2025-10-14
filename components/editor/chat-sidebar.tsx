'use client'

import { cn } from '@/lib/utils'
import { AIChatAssistant } from '@/components/ai-chat-assistant'
import type { FullCampaignContext, SelectedContext, Email } from '@/lib/types'

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  campaignContext?: FullCampaignContext
  email?: Email
  campaignType?: string
  onApplyEdits: (edits: Partial<Email>) => void
  selectedContext: SelectedContext | null
  onClearContext: () => void
  autoSubmitMessage: string | null
  onAutoSubmitComplete: () => void
}

export function ChatSidebar({
  isOpen,
  onClose,
  campaignContext,
  email,
  campaignType,
  onApplyEdits,
  selectedContext,
  onClearContext,
  autoSubmitMessage,
  onAutoSubmitComplete,
}: ChatSidebarProps) {
  return (
    <aside
      className={cn(
        'border-l border-border bg-card transition-all duration-300 shadow-lg flex-shrink-0',
        isOpen ? 'w-96' : 'w-0 overflow-hidden'
      )}
    >
      {isOpen && (
        <AIChatAssistant
          onClose={onClose}
          campaignContext={campaignContext}
          emailContext={
            email
              ? {
                  subject: email.subject,
                  content: email.content,
                  campaignType: campaignType || 'Unknown',
                }
              : undefined
          }
          onApplyEdits={onApplyEdits}
          selectedContext={selectedContext}
          onClearContext={onClearContext}
          autoSubmitMessage={autoSubmitMessage}
          onAutoSubmitComplete={onAutoSubmitComplete}
        />
      )}
    </aside>
  )
}
