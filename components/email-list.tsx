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
  const sortedEmails = useMemo(() => [...emails].sort((a, b) => a.day - b.day), [emails])

  return (
    <div className="px-4 pt-4 pb-6 space-y-2">
      {sortedEmails.map((email) => (
        <button
          key={email.id}
          onClick={() => onSelect(email.id)}
          className={cn(
            'group w-full text-left p-4 rounded-lg transition cursor-pointer border',
            selectedId === email.id
              ? 'bg-primary/10 border-primary/20'
              : 'bg-transparent border-transparent hover:bg-muted hover:border-border',
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition',
                selectedId === email.id
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted text-foreground/80 font-medium border border-border',
              )}
            >
              <span className="text-xs">{email.day}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm truncate">Day {email.day}</h3>
              </div>
              <p className="text-sm font-medium truncate mb-1">{email.subject}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{email.preview}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

// Memoize to prevent re-renders when props don't change
export const EmailList = memo(EmailListComponent)
