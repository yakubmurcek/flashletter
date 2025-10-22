'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Mail, User, Loader2, Timer } from 'lucide-react'
import { AnimatedSection, PulseButton } from '@/components/ui/animations'
import { InteractiveClock } from '@/components/ui/interactive-clock'
import Link from 'next/link'
import { useRegionDetection } from '@/lib/utils/location-detection'

interface WaitlistFormProps {
  className?: string
}

export function WaitlistForm({ className = '' }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [orderInfo, setOrderInfo] = useState<{
    order: number
    totalCount: number
  } | null>(null)

  // Region-based privacy controls
  const { locationInfo, isLoading } = useRegionDetection()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    // Validate required consent (only for non-US users)
    if (locationInfo?.requiresGDPR && !privacyConsent) {
      setError('You must accept the privacy policy to join the waitlist.')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: name || null,
          privacyConsent: locationInfo?.requiresGDPR ? privacyConsent : true,
          marketingConsent: locationInfo?.requiresGDPR
            ? marketingConsent
            : false,
          consentTimestamp: new Date().toISOString(),
          userRegion: locationInfo?.region || 'OTHER',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Something went wrong')
      }

      const responseData = await response.json()

      // Store order information if provided
      if (responseData.order && responseData.totalCount !== undefined) {
        setOrderInfo({
          order: responseData.order,
          totalCount: responseData.totalCount,
        })
      }

      setIsSubmitted(true)
      setEmail('')
      setName('')
      setPrivacyConsent(false)
      setMarketingConsent(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className={`relative animate-success-bounce ${className}`}>
        {/* Confetti effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-0 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-confetti"
            style={{ animationDelay: '0.2s' }}
          ></div>
          <div
            className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-confetti"
            style={{ animationDelay: '0.4s' }}
          ></div>
          <div
            className="absolute top-0 left-3/4 w-2 h-2 bg-orange-400 rounded-full animate-confetti"
            style={{ animationDelay: '0.6s' }}
          ></div>
          <div
            className="absolute top-0 left-1/3 w-1 h-1 bg-pink-400 rounded-full animate-confetti"
            style={{ animationDelay: '0.8s' }}
          ></div>
          <div
            className="absolute top-0 left-2/3 w-1.5 h-1.5 bg-blue-400 rounded-full animate-confetti"
            style={{ animationDelay: '1s' }}
          ></div>
        </div>

        <div className="relative text-center p-8 bg-green-50 dark:bg-green-950/20 rounded-2xl border border-green-200 dark:border-green-800 overflow-hidden">
          {/* Sparkle decorations */}
          <div
            className="absolute top-4 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-sparkle"
            style={{ animationDelay: '0.5s' }}
          ></div>
          <div
            className="absolute top-6 right-6 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-sparkle"
            style={{ animationDelay: '1s' }}
          ></div>
          <div
            className="absolute bottom-4 left-6 w-1 h-1 bg-yellow-500 rounded-full animate-sparkle"
            style={{ animationDelay: '1.5s' }}
          ></div>
          <div
            className="absolute bottom-6 right-4 w-2 h-2 bg-yellow-400 rounded-full animate-sparkle"
            style={{ animationDelay: '2s' }}
          ></div>

          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-checkmark-pulse" />
          <h3
            className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2 animate-fade-in-up"
            style={{ animationDelay: '0.8s' }}
          >
            You're on the list!
          </h3>

          {/* Show order information only if there are more than 9 users */}
          {orderInfo && orderInfo.totalCount > 9 && (
            <div
              className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-lg border border-amber-200 dark:border-amber-800 animate-fade-in-up"
              style={{ animationDelay: '1s' }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                  #{orderInfo.order}
                </div>
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  You're #{orderInfo.order} of {orderInfo.totalCount} people on
                  the waitlist
                </div>
              </div>
            </div>
          )}

          <p
            className="text-green-600 dark:text-green-400 animate-fade-in-up"
            style={{ animationDelay: '1.2s' }}
          >
            We'll notify you as soon as Flashletter is ready. Get ready for
            lightning-fast newsletter campaigns!
          </p>
        </div>
      </div>
    )
  }

  return (
    <AnimatedSection delay={0} immediate>
      <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Get Early Access
          </h2>
          <p className="text-muted-foreground text-lg">
            Be one of the first to experience the future
            <br />
            of newsletter campaigns
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name (optional)
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>
        </div>

        {/* Privacy Consent Section - Only show for non-US users */}
        {!isLoading && locationInfo?.requiresGDPR && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="privacy-consent"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  required
                />
                <label
                  htmlFor="privacy-consent"
                  className="text-sm text-foreground"
                >
                  <span className="font-medium">Privacy Policy Consent *</span>
                  <br />
                  <span className="text-muted-foreground">
                    I agree to the{' '}
                    <Link
                      href="/privacy"
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </Link>{' '}
                    and consent to the processing of my personal data for the
                    purpose of joining the waitlist.
                  </span>
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="marketing-consent"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label
                  htmlFor="marketing-consent"
                  className="text-sm text-foreground"
                >
                  <span className="font-medium">
                    Marketing Communications (Optional)
                  </span>
                  <br />
                  <span className="text-muted-foreground">
                    I would like to receive additional marketing communications
                    about Flashletter features, tips, and special offers. You
                    can unsubscribe at any time.
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <PulseButton>
          <Button
            type="submit"
            disabled={
              isSubmitting || (locationInfo?.requiresGDPR && !privacyConsent)
            }
            className="w-full h-12 text-base bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining Waitlist...
              </>
            ) : (
              'Join the Waitlist'
            )}
          </Button>
        </PulseButton>

        <p className="text-xs text-muted-foreground text-center">
          {locationInfo?.requiresGDPR ? (
            <>
              By joining, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              . You can{' '}
              <Link
                href="/unsubscribe"
                className="text-primary hover:underline"
              >
                unsubscribe
              </Link>{' '}
              at any time.
            </>
          ) : (
            <>
              By joining, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              . No spam, just updates about Flashletter.
            </>
          )}
        </p>
      </form>
    </AnimatedSection>
  )
}
