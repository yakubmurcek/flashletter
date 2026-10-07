'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { BillingInterval } from '@/lib/billing/plans'

/**
 * Picks up a Pro checkout the user started before they had an account
 * (pricing → sign up → here), so they don't have to click Upgrade twice.
 */
export function ResumeCheckout({ interval }: { interval: BillingInterval }) {
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true
    fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interval }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
        if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout')
        window.location.href = data.url
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Could not start checkout'),
      )
  }, [interval])

  return (
    <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      {error ? (
        <span className="text-destructive">{error}</span>
      ) : (
        <span className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Taking you to secure checkout…
        </span>
      )}
    </div>
  )
}
