'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function CreateError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Create campaign error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-destructive">Campaign Creation Error</h2>
          <p className="text-sm text-muted-foreground">
            Something went wrong while creating your campaign. Your progress may have been saved.
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
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/campaigns')}
            className="flex-1"
          >
            View campaigns
          </Button>
        </div>
      </Card>
    </div>
  )
}
