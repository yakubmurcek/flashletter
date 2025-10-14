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
    <aside className="w-80 border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border flex-shrink-0 h-20">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="font-semibold truncate">Campaign Emails</h2>
        </div>
        <p className="text-sm text-muted-foreground truncate">
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
