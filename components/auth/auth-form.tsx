'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { useRegionDetection } from '@/lib/utils/location-detection'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [legalConsent, setLegalConsent] = useState(false)

  const { locationInfo, isLoading } = useRegionDetection()

  const requiresNonUSConsent = mode === 'signup' && !isLoading && locationInfo?.region === 'OTHER'
  const needsConsentConfirmation = requiresNonUSConsent && !legalConsent

  useEffect(() => {
    if (mode !== 'signup') {
      setLegalConsent(false)
    }
  }, [mode])

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (oauthLoading) return

    setLoading(true)
    setError(null)
    setMessage(null)

    if (needsConsentConfirmation) {
      setError('You must agree to the Terms and Privacy Policy to continue.')
      setLoading(false)
      return
    }

    try {
      if (mode === 'signup') {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (signInError) throw signInError
        }

        const params = new URLSearchParams(window.location.search)
        const redirectTo = params.get('redirectTo') || '/campaigns'
        router.push(redirectTo)
        return
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // Get redirect URL from query params or default to home
        const params = new URLSearchParams(window.location.search)
        const redirectTo = params.get('redirectTo') || '/campaigns'
        router.push(redirectTo)
        // Don't reset loading state - let the page navigation handle it
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (needsConsentConfirmation) {
      setError('You must agree to the Terms and Privacy Policy to continue.')
      return
    }

    setError(null)
    setMessage(null)
    setOauthLoading(true)

    let shouldResetLoading = true

    try {
      const params = new URLSearchParams(window.location.search)
      const redirectTo = params.get('redirectTo')
      const callbackUrl = new URL('/auth/callback', window.location.origin)

      if (redirectTo) {
        callbackUrl.searchParams.set('redirectTo', redirectTo)
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })

      if (error) {
        throw error
      }

      if (data?.url) {
        shouldResetLoading = false
        window.location.href = data.url
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      if (shouldResetLoading) {
        setOauthLoading(false)
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading || oauthLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading || oauthLoading}
          minLength={6}
        />
        {mode === 'signup' && (
          <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
        )}
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {message && (
        <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
          {message}
        </div>
      )}

      {mode === 'signup' && (
        <div className="space-y-3">
          {!isLoading && locationInfo?.requiresGDPR ? (
            <div className="flex items-start space-x-3 rounded-md border border-border/40 p-3 bg-muted/30">
              <input
                type="checkbox"
                id="legal-consent"
                checked={legalConsent}
                onChange={(e) => setLegalConsent(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                required
              />
              <label
                htmlFor="legal-consent"
                className="text-xs leading-5 text-muted-foreground text-left"
              >
                I agree to the{' '}
                <Link
                  href="/terms"
                  className="font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  className="font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Privacy Policy
                </Link>{' '}
                and consent to the processing of my personal data in accordance with GDPR.
              </label>
            </div>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you agree to our{' '}
              <Link
                href="/terms"
                className="font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Privacy Policy
              </Link>
              .
            </p>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || oauthLoading || needsConsentConfirmation}
        className="w-full bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 transition-all duration-300"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {mode === 'signup' ? 'Creating Account...' : 'Signing In...'}
          </>
        ) : mode === 'signup' ? (
          'Create Account'
        ) : (
          'Sign In'
        )}
      </Button>

      <div className="relative">
        <Separator className="bg-border/60" />
        <span className="absolute inset-x-0 -top-2 flex justify-center text-xs uppercase text-muted-foreground">
          <span className="bg-background px-2">Or continue with</span>
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={loading || oauthLoading || needsConsentConfirmation}
        onClick={handleGoogleSignIn}
        className="w-full"
      >
        {oauthLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting...
          </>
        ) : (
          <>
            <GoogleIcon className="h-4 w-4" />
            Continue with Google
          </>
        )}
      </Button>
    </form>
  )
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      focusable="false"
      {...props}
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.72h5.26c-.21 1.34-.95 2.48-2.03 3.24l3.29 2.56c1.92-1.77 3.03-4.38 3.03-7.47 0-.72-.06-1.42-.18-2.08H12z"
      />
      <path
        fill="#34A853"
        d="M6.64 13.53l-.83.64-2.62 2.04C4.79 19.99 8.13 22.5 12 22.5c2.7 0 4.97-.89 6.63-2.39l-3.29-2.56c-.87.6-1.99.95-3.34.95-2.56 0-4.73-1.73-5.5-4.08z"
      />
      <path
        fill="#4A90E2"
        d="M3.19 7.79C2.43 9.14 2 10.71 2 12.38c0 1.66.43 3.25 1.19 4.59l3.45-2.86c-.2-.6-.31-1.24-.31-1.9s.11-1.3.31-1.9z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.96c1.47 0 2.79.5 3.83 1.48l2.87-2.87C16.96 2.66 14.7 1.5 12 1.5c-3.87 0-7.21 2.51-8.81 6.11l3.45 2.86C7.27 7.69 9.44 5.96 12 5.96z"
      />
    </svg>
  )
}
