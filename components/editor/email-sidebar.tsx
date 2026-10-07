'use client'

import { memo, type ReactNode } from 'react'
import { Mail } from 'lucide-react'
import { EmailList } from '@/components/email-list'
import type { Email } from '@/lib/types'

interface EmailSidebarProps {
  emails: Email[]
  selectedId: number
  onSelect: (id: number) => void
  configPanel?: ReactNode
  pendingCount?: number
}

function EmailSidebarComponent({
  emails,
  selectedId,
  onSelect,
  configPanel,
  pendingCount = 0,
}: EmailSidebarProps) {
  return (
    <aside className="w-80 flex flex-col bg-card border-r border-border">
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Emails
            </h2>
          </div>
          <span className="text-xs font-medium text-muted-foreground tabular">
            {pendingCount > 0
              ? `${emails.length} of ${emails.length + pendingCount}`
              : `${emails.length} total`}
          </span>
        </div>
      </div>
      {configPanel}
      <div className="flex-1 overflow-y-auto">
        <EmailList
          emails={emails}
          selectedId={selectedId}
          onSelect={onSelect}
          pendingCount={pendingCount}
        />
      </div>
    </aside>
  )
}

// Memoize to prevent re-renders when props don't change
export const EmailSidebar = memo(EmailSidebarComponent)
