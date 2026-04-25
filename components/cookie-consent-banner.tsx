'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, Cookie, Settings } from 'lucide-react'
import Link from 'next/link'
import { useRegionDetection } from '@/lib/utils/location-detection'

interface CookieConsentBannerProps {
  className?: string
}

export function CookieConsentBanner({ className = '' }: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Region-based privacy controls
  const { locationInfo, isLoading } = useRegionDetection()

  useEffect(() => {
    // Only show cookie banner for non-US users (GDPR requirement)
    if (!isLoading && locationInfo?.requiresGDPR) {
      const consent = localStorage.getItem('cookie-consent')
      if (!consent) {
        setIsVisible(true)
      }
    }
  }, [isLoading, locationInfo])

  const handleAcceptAll = () => {
    localStorage.setItem(
      'cookie-consent',
      JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: true,
        timestamp: new Date().toISOString(),
      }),
    )
    setIsVisible(false)
  }

  const handleAcceptNecessary = () => {
    localStorage.setItem(
      'cookie-consent',
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        timestamp: new Date().toISOString(),
      }),
    )
    setIsVisible(false)
  }

  const handleReject = () => {
    localStorage.setItem(
      'cookie-consent',
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        timestamp: new Date().toISOString(),
      }),
    )
    setIsVisible(false)
  }

  // Don't show cookie banner for US users or while loading
  if (!isVisible || isLoading || !locationInfo?.requiresGDPR) return null

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${className}`}>
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Cookie className="w-6 h-6 text-primary" />
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    We use cookies to enhance your experience
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    We use essential cookies to make our site work. We&apos;d also like to set
                    analytics cookies to help us improve it. By clicking &quot;Accept All&quot;, you
                    consent to our use of cookies. You can manage your preferences or learn more in
                    our{' '}
                    <Link
                      href="/privacy"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(false)}
                  className="flex-shrink-0 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {showDetails && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium">Cookie Categories</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>
                        <strong>Necessary Cookies</strong> - Required for the website to function
                      </span>
                      <span className="text-muted-foreground">Always Active</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>
                        <strong>Analytics Cookies</strong> - Help us understand how visitors
                        interact with our website
                      </span>
                      <span className="text-muted-foreground">Optional</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>
                        <strong>Marketing Cookies</strong> - Used to track visitors across websites
                        for advertising
                      </span>
                      <span className="text-muted-foreground">Optional</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAcceptAll}
                  className="bg-primary hover:bg-primary/90"
                >
                  Accept All
                </Button>
                <Button
                  onClick={handleAcceptNecessary}
                  variant="outline"
                >
                  Accept Necessary Only
                </Button>
                <Button
                  onClick={handleReject}
                  variant="ghost"
                >
                  Reject All
                </Button>
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  {showDetails ? 'Hide Details' : 'Cookie Settings'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
