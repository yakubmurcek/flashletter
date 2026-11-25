import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client with the service-role key. Bypasses row-level
 * security, so use it only for database functions that are closed to client
 * roles and only after the route has done its own authorization (for example
 * the waitlist unsubscribe route, which first verifies the signed link).
 * Never import this from a client component: the bundle scan in CI fails the
 * build if the key reaches the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
