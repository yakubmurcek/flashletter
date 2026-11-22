import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GET } from '@/app/api/keep-alive/route'

const fetchMock = vi.fn()

function request(headers: Record<string, string> = {}) {
  return new Request('https://flashletter.app/api/keep-alive', { headers }) as never
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  delete process.env.CRON_SECRET
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GET /api/keep-alive', () => {
  it('runs one read against the database with the public key', async () => {
    fetchMock.mockResolvedValue(new Response('[]', { status: 200 }))
    const res = await GET(request())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://proj.supabase.co/rest/v1/campaigns?select=id&limit=1')
    expect(init.headers).toEqual({ apikey: 'anon-key', Authorization: 'Bearer anon-key' })
  })

  it('reports 503 when the project is paused or unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const res = await GET(request())
    expect(res.status).toBe(503)
    expect((await res.json()).ok).toBe(false)
  })

  it('reports 503 when the database answers with an error', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 540 }))
    const res = await GET(request())
    expect(res.status).toBe(503)
  })

  it('refuses callers without the cron secret when one is set', async () => {
    process.env.CRON_SECRET = 's3cret'
    const res = await GET(request())
    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue(new Response('[]', { status: 200 }))
    const ok = await GET(request({ authorization: 'Bearer s3cret' }))
    expect(ok.status).toBe(200)
  })

  it('is scheduled daily in vercel.json', () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'))
    expect(config.crons).toEqual([{ path: '/api/keep-alive', schedule: '0 6 * * *' }])
  })
})
