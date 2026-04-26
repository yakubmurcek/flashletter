'use client'

import { memo } from 'react'
import { Mail } from 'lucide-react'
import { EmailList } from '@/components/email-list'
import type { Email } from '@/lib/types'

interface EmailSidebarProps {
  emails: Email[]
  selectedId: number
  onSelect: (id: number) => void
  campaignType?: string
  tone?: string
}

function EmailSidebarComponent({
  emails,
  selectedId,
  onSelect,
  campaignType,
  tone,
}: EmailSidebarProps) {
  return (
    <aside className="w-80 flex flex-col bg-card border-r border-border">
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Emails
            </h2>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{emails.length} total</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {campaignType || 'Unknown'} • {tone || 'Unknown tone'}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <EmailList
          emails={emails}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>
    </aside>
  )
}

// Memoize to prevent re-renders when props don't change
export const EmailSidebar = memo(EmailSidebarComponent)
