import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectToParam = requestUrl.searchParams.get('redirectTo')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // URL to redirect to after sign in process completes
  const isValidRedirect =
    redirectToParam && redirectToParam.startsWith('/') && !redirectToParam.startsWith('//')

  const fallbackPath = '/campaigns'
  const redirectPath = isValidRedirect ? redirectToParam : fallbackPath

  return NextResponse.redirect(new URL(redirectPath, origin))
}
