'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { readConsent, saveConsent } from '@/lib/analytics'

interface CookieConsentBannerProps {
  className?: string
}

/**
 * Asks every visitor once whether analytics may run. Nothing is tracked or
 * recorded until they accept (see `lib/analytics.ts`). Only mounted when
 * PostHog is configured, so there is no banner for tracking that doesn't exist.
 */
export function CookieConsentBanner({ className = '' }: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Read after mount: localStorage isn't available during server rendering.
  useEffect(() => {
    if (!readConsent()) setIsVisible(true)
  }, [])

  const choose = (analytics: boolean) => {
    saveConsent(analytics)
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <section
      aria-label="Cookie choice"
      className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${className}`}
    >
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Cookie
              aria-hidden="true"
              className="hidden sm:block w-6 h-6 text-primary flex-shrink-0"
            />
            <p className="flex-1 text-sm text-muted-foreground">
              We use cookies to keep you signed in. With your OK we also use analytics cookies and
              record sessions to see where the app gets in your way. Read more in our{' '}
              <Link
                href="/privacy"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => choose(false)}
              >
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => choose(true)}
              >
                Accept
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
