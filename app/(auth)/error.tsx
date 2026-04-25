'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Auth error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-display text-2xl text-destructive">Authentication Error</h2>
          <p className="text-sm text-muted-foreground">
            Unable to complete authentication. Please try again or contact support.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono">Error ID: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={reset}
            className="flex-1"
          >
            Retry
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="flex-1"
          >
            Go home
          </Button>
        </div>
      </Card>
    </div>
  )
}
