'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [legalConsent, setLegalConsent] = useState(false)

  const { locationInfo, isLoading } = useRegionDetection()

  useEffect(() => {
    if (mode !== 'signup') {
      setLegalConsent(false)
    }
  }, [mode])

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'signup' && locationInfo?.requiresGDPR && !legalConsent) {
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
          const { error: signInError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            })

          if (signInError) throw signInError
        }

        const params = new URLSearchParams(window.location.search)
        const redirectTo = params.get('redirectTo') || '/'
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
        const redirectTo = params.get('redirectTo') || '/'
        router.push(redirectTo)
        // Don't reset loading state - let the page navigation handle it
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
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
          disabled={loading}
          minLength={6}
        />
        {mode === 'signup' && (
          <p className="text-xs text-muted-foreground">
            Password must be at least 6 characters
          </p>
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
                and consent to the processing of my personal data in accordance
                with GDPR.
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
        disabled={
          loading ||
          (mode === 'signup' &&
            locationInfo?.requiresGDPR &&
            !legalConsent &&
            !isLoading)
        }
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
    </form>
  )
}
