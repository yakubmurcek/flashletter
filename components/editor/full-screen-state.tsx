'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface FullScreenStateProps {
  title: string
  message: string
  actionHref?: string
  actionLabel?: string
  details?: Record<string, string | number | boolean | null | undefined>
}

export function FullScreenState({
  title,
  message,
  actionHref,
  actionLabel,
  details,
}: FullScreenStateProps) {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p className="text-muted-foreground mb-4">{message}</p>
        {details && (
          <div className="space-y-2 text-sm text-muted-foreground">
            {Object.entries(details).map(([k, v]) => (
              <p key={k}>
                {k}: {typeof v === 'boolean' ? (v ? '✓' : '✗') : String(v)}
              </p>
            ))}
          </div>
        )}
        {actionHref && actionLabel && (
          <Button asChild className="mt-4">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
