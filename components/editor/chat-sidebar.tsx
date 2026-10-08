'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
  shouldFocusInput: boolean
  onFocusHandled: () => void
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
  shouldFocusInput,
  onFocusHandled,
}: ChatSidebarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <aside
      className={cn(
        'fixed inset-y-0 right-0 transition-all duration-300 z-[60]',
        'supports-[backdrop-filter]:backdrop-blur-2xl bg-background/95',
        'shadow-xl border-l border-border',
        isOpen ? 'w-full sm:w-96' : 'w-0 overflow-hidden',
      )}
      role="dialog"
      aria-modal="true"
    >
      {isOpen && (
        <div className="h-full">
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
            shouldFocusInput={shouldFocusInput}
            onFocusHandled={onFocusHandled}
          />
        </div>
      )}
    </aside>,
    document.body,
  )
}
