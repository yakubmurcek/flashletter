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
}

function EmailSidebarComponent({
  emails,
  selectedId,
  onSelect,
  campaignType,
}: EmailSidebarProps) {
  return (
    <aside className="w-80 border-r border-border/60 bg-card/95 backdrop-blur-sm flex flex-col hover:border-border/80 transition-colors">
      <div className="p-4 flex-shrink-0 h-20 border-b border-border/40">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-semibold text-sm truncate">Campaign Emails</h2>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {emails.length} emails • {campaignType || 'Unknown'}
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
