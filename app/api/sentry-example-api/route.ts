import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  throw new Error('Sentry Example Backend Error')
  return NextResponse.json({ data: 'Testing Sentry Error...' })
}
