'use client'
import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface Email {
  id: number
  uuid?: string | null
  day: number
  subject: string
  preview: string
}

interface EmailListProps {
  emails: Email[]
  selectedId: number
  onSelect: (id: number) => void
}

function EmailListComponent({ emails, selectedId, onSelect }: EmailListProps) {
  // Memoize sorted emails to avoid resorting on every render
  const sortedEmails = useMemo(
    () => [...emails].sort((a, b) => a.day - b.day),
    [emails]
  )

  return (
    <div className="p-2 space-y-1">
      {sortedEmails.map((email) => (
        <button
          key={email.id}
          onClick={() => onSelect(email.id)}
          className={cn(
            'w-full text-left p-3 rounded-lg transition-all duration-200',
            'border border-border/40 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md',
            selectedId === email.id
              ? 'bg-gradient-to-r from-primary/10 to-amber-400/5 border-primary/30 shadow-sm'
              : ''
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                selectedId === email.id
                  ? 'bg-gradient-to-br from-primary to-amber-500/70 text-primary-foreground font-semibold'
                  : 'bg-primary/10 text-primary font-medium'
              )}
            >
              <span className="text-xs">{email.day}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm truncate">
                  Day {email.day}
                </h3>
              </div>
              <p className="text-sm font-medium truncate mb-1">
                {email.subject}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {email.preview}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

// Memoize to prevent re-renders when props don't change
export const EmailList = memo(EmailListComponent)
