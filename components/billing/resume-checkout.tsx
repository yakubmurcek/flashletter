'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { BillingInterval } from '@/lib/billing/plans'

/**
 * Takes `?upgrade=` out of the address bar. Returns false when it was already
 * gone, i.e. this checkout was started before (a remount, or Back from Stripe).
 */
function consumeUpgradeParam(): boolean {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('upgrade')) return false
  url.searchParams.delete('upgrade')
  // Native replaceState (not router.replace): no server round trip racing the
  // redirect. Pass null, not history.state: Next only syncs its router to the
  // new URL when the state isn't its own, otherwise it could put ?upgrade= back.
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  return true
}

/**
 * Picks up a Pro checkout the user started before they had an account
 * (pricing → sign up → here), so they don't have to click Upgrade twice.
 */
export function ResumeCheckout({ interval }: { interval: BillingInterval }) {
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    // Without the param, Back from Stripe would land here and launch it again.
    if (!consumeUpgradeParam()) {
      setHidden(true)
      return
    }
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

  // Back from Stripe can restore this page from the back/forward cache with
  // the spinner still up; the Upgrade buttons below are the way forward then.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setHidden(true)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  if (hidden) return null

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
