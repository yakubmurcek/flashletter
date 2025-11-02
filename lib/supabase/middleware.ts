import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { FEATURE_FLAGS } from '@/lib/constants/app'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - require authentication
  const protectedRoutes = ['/create', '/campaigns', '/api/campaigns']
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  const useWaitlistVariant = !FEATURE_FLAGS.SHOW_FULL_PRODUCT

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    if (useWaitlistVariant) {
      url.pathname = '/'
      url.hash = 'waitlist'
    } else {
      url.pathname = '/login'
      url.searchParams.set('redirectTo', request.nextUrl.pathname)
    }
    return NextResponse.redirect(url)
  }

  // Auth routes - redirect to home if already logged in
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.includes(request.nextUrl.pathname)

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    if (useWaitlistVariant) {
      url.pathname = '/'
      url.hash = 'waitlist'
    } else {
      url.pathname = '/'
      url.hash = ''
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
