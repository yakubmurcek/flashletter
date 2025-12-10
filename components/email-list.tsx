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
            'group w-full text-left p-4 rounded-2xl transition-all duration-300 cursor-pointer',
            'bg-white/[0.04] hover:bg-white/[0.07] hover:shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)]',
            'ring-1 ring-transparent hover:ring-primary/20',
            selectedId === email.id
              ? 'bg-primary/10 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.4)] ring-primary/30'
              : '',
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                selectedId === email.id
                  ? 'bg-primary text-primary-foreground font-semibold shadow-lg'
                  : 'bg-muted text-foreground/80 font-medium ring-1 ring-border/15',
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
