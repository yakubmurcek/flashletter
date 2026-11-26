/**
 * The Supabase URL and anon key every client needs, or a clear error naming the
 * missing variable. `process.env.NEXT_PUBLIC_*` must be read by its full name so
 * Next.js can inline it into the browser bundle.
 */
export function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please check your .env.local file.',
    )
  }

  if (!anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. Please check your .env.local file.',
    )
  }

  return { url, anonKey }
}
