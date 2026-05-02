'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics'

/**
 * Fires `signup_completed` once when the OAuth callback redirects here with
 * `?signedUp=1`, then strips the param so a refresh doesn't double-count.
 *
 * Lives on /campaigns specifically because that's where the callback's
 * default `fallbackPath` lands, and because PostHog is most likely already
 * initialized by the time the user reaches it. A guarding ref handles the
 * `useEffect` double-invoke that React StrictMode does in dev.
 */
export function SignupTracker() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    if (searchParams.get('signedUp') !== '1') return

    firedRef.current = true
    track('signup_completed')

    const next = new URLSearchParams(searchParams.toString())
    next.delete('signedUp')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  return null
}
