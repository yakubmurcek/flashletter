import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const providerError = requestUrl.searchParams.get('error')
  const providerErrorDescription = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin
  const redirectToParam = requestUrl.searchParams.get('redirectTo')

  let errorMessage: string | null = null
  // Marker for the client to fire `signup_completed` exactly once after a
  // successful OAuth round-trip. We can't capture server-side without
  // posthog-node, and the next page load is the natural place to identify
  // and emit. The /campaigns mount handler is responsible for stripping
  // this param after consuming it.
  let signedUp = false

  if (providerError) {
    errorMessage = providerErrorDescription || providerError
    Sentry.captureMessage('OAuth provider returned error to /auth/callback', {
      level: 'warning',
      tags: { auth_route: '/auth/callback', stage: 'provider_error' },
      extra: { providerError, providerErrorDescription },
    })
  } else if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      errorMessage = error.message
      Sentry.captureException(error, {
        tags: { auth_route: '/auth/callback', stage: 'exchange_code' },
      })
    } else {
      signedUp = true
    }
  }

  const isValidRedirect =
    redirectToParam && redirectToParam.startsWith('/') && !redirectToParam.startsWith('//')

  const fallbackPath = '/campaigns'
  const basePath = isValidRedirect ? redirectToParam : fallbackPath

  const redirectUrl = new URL(basePath, origin)
  if (errorMessage) {
    redirectUrl.searchParams.set('authError', errorMessage)
  }
  if (signedUp) {
    redirectUrl.searchParams.set('signedUp', '1')
  }

  return NextResponse.redirect(redirectUrl)
}
