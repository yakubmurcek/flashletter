import { NextResponse, type NextRequest } from 'next/server'

// Supabase's free plan pauses a project after about a week without database
// traffic, and a paused project takes the whole product down (guests can't
// start, nobody can sign in). A daily Vercel cron (vercel.json) calls this
// route, which runs one tiny read through PostgREST so the project stays awake.
// Row-level security returns no rows to the public key; the query still runs.

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${url}/rest/v1/campaigns?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status }, { status: 503 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unreachable'
    return NextResponse.json({ ok: false, error: message }, { status: 503 })
  }
}
