'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Opens the Stripe customer portal: change plan, card, invoices, cancel. */
export function PortalButton({ children = 'Manage billing' }: { children?: React.ReactNode }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open billing')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing')
      setLoading(false)
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        onClick={open}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Opening…
          </>
        ) : (
          children
        )}
      </Button>
      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}
