'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { LegalConsent, useLegalConsent } from '@/components/auth/legal-consent'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

/**
 * Allow only same-origin paths starting with a single `/`. Blocks
 * `https://evil.com`, `//evil.com`, and `/\evil.com` flavors of open-redirect
 * payloads carried in `?redirectTo=...`.
 */
function safeRedirectPath(target: string | null, fallback = '/campaigns'): string {
  if (!target) return fallback
  if (!target.startsWith('/')) return fallback
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback
  return target
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { ensureConsent, reset: resetConsent, consentProps } = useLegalConsent(mode === 'signup')

  useEffect(() => {
    if (mode !== 'signup') {
      resetConsent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (oauthLoading) return

    if (!ensureConsent()) return

    setLoading(true)
    setError(null)
    setMessage(null)

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
        router.push(safeRedirectPath(params.get('redirectTo')))
        return
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // Get redirect URL from query params or default to home
        const params = new URLSearchParams(window.location.search)
        router.push(safeRedirectPath(params.get('redirectTo')))
        // Don't reset loading state - let the page navigation handle it
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!ensureConsent()) return

    setError(null)
    setMessage(null)
    setOauthLoading(true)

    let shouldResetLoading = true

    try {
      const params = new URLSearchParams(window.location.search)
      const redirectTo = safeRedirectPath(params.get('redirectTo'))
      const callbackUrl = new URL('/auth/callback', window.location.origin)

      if (redirectTo !== '/campaigns') {
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
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
          {error}
        </div>
      )}

      {message && (
        <div className="p-3 text-sm text-foreground bg-primary/10 border border-primary/30 rounded-md">
          {message}
        </div>
      )}

      {mode === 'signup' && (
        <LegalConsent
          {...consentProps}
          idPrefix="legal"
        />
      )}

      <Button
        type="submit"
        disabled={loading || oauthLoading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {mode === 'signup' ? 'Creating Account...' : 'Signing In...'}
          </>
        ) : mode === 'signup' ? (
          'Create Account'
        ) : (
          'Sign in'
        )}
      </Button>

      <div className="relative">
        <Separator />
        <span className="absolute inset-x-0 -top-2 flex justify-center text-xs uppercase tracking-widest text-muted-foreground">
          <span className="bg-card px-2">Or continue with</span>
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={loading || oauthLoading}
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
