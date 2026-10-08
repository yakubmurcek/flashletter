'use client'

import { memo, type ReactNode } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
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
    <aside className="hidden md:flex w-80 flex-shrink-0 flex-col bg-card border-r border-border">
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

interface MobileEmailTabsProps {
  emails: Email[]
  selectedId: number
  onSelect: (id: number) => void
  pendingCount?: number
}

/** Phone-width stand-in for the sidebar: one chip per email, scrolls sideways. */
export function MobileEmailTabs({
  emails,
  selectedId,
  onSelect,
  pendingCount = 0,
}: MobileEmailTabsProps) {
  if (emails.length === 0 && pendingCount === 0) return null
  const sorted = [...emails].sort((a, b) => a.day - b.day)
  return (
    <nav
      aria-label="Emails in this sequence"
      className="md:hidden flex-shrink-0 flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-3"
    >
      {sorted.map((email) => (
        <button
          key={email.id}
          type="button"
          onClick={() => onSelect(email.id)}
          aria-current={selectedId === email.id ? 'true' : undefined}
          className={cn(
            'flex-shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition',
            selectedId === email.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-foreground/80',
          )}
        >
          Day {email.day}
        </button>
      ))}
      {Array.from({ length: pendingCount }, (_, i) => (
        <span
          key={`pending-${i}`}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Day {sorted.length + i + 1}
        </span>
      ))}
    </nav>
  )
}
