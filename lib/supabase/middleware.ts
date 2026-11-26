import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseEnv } from './env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const { url, anonKey } = supabaseEnv()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        supabaseResponse = NextResponse.next({
          request,
        })
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - require authentication
  const protectedRoutes = ['/create', '/campaigns', '/api/campaigns']
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  )

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    const redirectDestination = `${request.nextUrl.pathname}${
      request.nextUrl.search ?? ''
    }${request.nextUrl.hash ?? ''}`
    url.pathname = '/login'
    url.search = ''
    url.hash = ''
    url.searchParams.set('redirectTo', redirectDestination)
    return NextResponse.redirect(url)
  }

  // Auth routes - redirect to home if already logged in. Guest (anonymous)
  // sessions pass through: /signup upgrades them in place, /login swaps them.
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.includes(request.nextUrl.pathname)

  if (isAuthRoute && user && !user.is_anonymous) {
    const url = request.nextUrl.clone()
    url.pathname = '/campaigns'
    url.search = ''
    url.hash = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
