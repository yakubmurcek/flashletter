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

  return NextResponse.redirect(redirectUrl)
}
