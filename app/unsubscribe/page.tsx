'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppShell } from '@/components/layouts/app-shell'
import { CheckCircle, AlertCircle, Mail, Trash2 } from 'lucide-react'

const SUCCESS_MESSAGE =
  'You have been successfully removed from our waitlist. You will no longer receive updates from us.'

async function submitUnsubscribe(payload: { email?: string; token?: string }): Promise<void> {
  const response = await fetch('/api/waitlist/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(
      (data && typeof data === 'object' && 'error' in data && (data as { error: string }).error) ||
        'Something went wrong',
    )
  }
}

function UnsubscribePageContent() {
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // When the user arrives via a signed link, auto-submit once. Single-shot
  // so a re-render or React Strict Mode double-mount doesn't fire it twice.
  const autoSubmittedRef = useRef(false)
  useEffect(() => {
    if (!tokenFromUrl || autoSubmittedRef.current) return
    autoSubmittedRef.current = true

    setIsSubmitting(true)
    submitUnsubscribe({ token: tokenFromUrl })
      .then(() => setResult({ type: 'success', message: SUCCESS_MESSAGE }))
      .catch((err) =>
        setResult({
          type: 'error',
          message: err instanceof Error ? err.message : 'Something went wrong',
        }),
      )
      .finally(() => setIsSubmitting(false))
  }, [tokenFromUrl])

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setResult(null)

    try {
      await submitUnsubscribe({ email })
      setResult({ type: 'success', message: SUCCESS_MESSAGE })
      setEmail('')
    } catch (err) {
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell chrome="centered">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-display text-2xl md:text-3xl mb-2">Unsubscribe</h1>
          <p className="text-muted-foreground leading-relaxed">
            Remove your email from our waitlist
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Unsubscribe from Waitlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleUnsubscribe}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {result && (
                <div
                  className={`p-3 rounded-md flex items-start gap-3 text-sm ${
                    result.type === 'success'
                      ? 'bg-primary/10 border border-primary/30 text-foreground'
                      : 'bg-destructive/10 border border-destructive/30 text-destructive'
                  }`}
                >
                  {result.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <p>{result.message}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full"
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Unsubscribe
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact us at{' '}
            <a
              href="mailto:support@flashletter.com"
              className="text-primary hover:underline"
            >
              support@flashletter.com
            </a>
          </p>
        </div>
      </div>
    </AppShell>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribePageContent />
    </Suspense>
  )
}
