'use client'
import { cn } from '@/lib/utils'

interface Email {
  id: number
  uuid?: string
  day: number
  subject: string
  preview: string
}

interface EmailListProps {
  emails: Email[]
  selectedId: number
  onSelect: (id: number) => void
}

export function EmailList({ emails, selectedId, onSelect }: EmailListProps) {
  // Sort emails by day to ensure proper order
  const sortedEmails = [...emails].sort((a, b) => a.day - b.day)

  return (
    <div className="p-2 space-y-1">
      {sortedEmails.map((email) => (
        <button
          key={email.id}
          onClick={() => onSelect(email.id)}
          className={cn(
            'w-full text-left p-3 rounded-lg transition-colors',
            'hover:bg-muted/50',
            selectedId === email.id ? 'bg-muted' : ''
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                selectedId === email.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              <span className="text-xs font-medium">{email.day}</span>
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
