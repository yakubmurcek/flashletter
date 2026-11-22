'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/analytics'
import type { BillingInterval } from '@/lib/billing/plans'

interface UpgradeButtonProps {
  interval: BillingInterval
  className?: string
  variant?: 'default' | 'outline'
  children?: ReactNode
}

/**
 * Sends a signed-in user to Stripe Checkout. Visitors and guests create an
 * account first and land back on /account, which resumes the checkout.
 */
export function UpgradeButton({
  interval,
  className,
  variant = 'default',
  children,
}: UpgradeButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    track('upgrade_clicked', { interval })
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      })
      if (res.status === 401) {
        const resume = `/account?upgrade=${interval}`
        router.push(`/signup?redirectTo=${encodeURIComponent(resume)}`)
        return
      }
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout')
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        className="w-full"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Opening checkout…
          </>
        ) : (
          (children ?? 'Upgrade to Pro')
        )}
      </Button>
      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-destructive text-center"
        >
          {error}
        </p>
      )}
    </div>
  )
}
