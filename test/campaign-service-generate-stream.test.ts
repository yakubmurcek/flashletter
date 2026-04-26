import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CampaignService, type GenerateEmailsStreamEvent } from '@/lib/services/campaign.service'
import type { CampaignConfig, Email } from '@/lib/types'

function makeStreamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
  return new Response(stream, {
    status,
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}

function serializeEvent(event: GenerateEmailsStreamEvent): string {
  return JSON.stringify(event) + '\n'
}

const config: CampaignConfig = { tone: 'friendly', campaignType: 'nurture', days: 3 }

const email1: Email = {
  id: 1,
  uuid: '00000000-0000-0000-0000-000000000001',
  day: 1,
  subject: 'Welcome',
  preview: "You're in.",
  content: 'Body 1',
}
const email2: Email = {
  id: 2,
  uuid: '00000000-0000-0000-0000-000000000002',
  day: 2,
  subject: 'Story',
  preview: 'Why we built this',
  content: 'Body 2',
}
const email3: Email = {
  id: 3,
  uuid: '00000000-0000-0000-0000-000000000003',
  day: 3,
  subject: 'Close',
  preview: 'Last chance',
  content: 'Body 3',
}

describe('CampaignService.generateEmailsStream', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses a happy-path stream and returns the persisted emails', async () => {
    const events: GenerateEmailsStreamEvent[] = [
      { type: 'start', total: 3 },
      { type: 'email', email: { ...email1, uuid: null } },
      { type: 'email', email: { ...email2, uuid: null } },
      { type: 'email', email: { ...email3, uuid: null } },
      { type: 'complete', emails: [email1, email2, email3] },
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(events.map(serializeEvent)))

    const received: GenerateEmailsStreamEvent[] = []
    const result = await CampaignService.generateEmailsStream(
      'https://example.com',
      'page',
      config,
      (e) => received.push(e),
    )

    expect(received.map((e) => e.type)).toEqual(['start', 'email', 'email', 'email', 'complete'])
    expect(result).toHaveLength(3)
    // Final array should be the persisted version (with UUIDs from the complete event).
    expect(result[0].uuid).toBe(email1.uuid)
    expect(result[2].uuid).toBe(email3.uuid)
  })

  it('emits email events in day order', async () => {
    const events: GenerateEmailsStreamEvent[] = [
      { type: 'start', total: 3 },
      { type: 'email', email: { ...email1, uuid: null } },
      { type: 'email', email: { ...email2, uuid: null } },
      { type: 'email', email: { ...email3, uuid: null } },
      { type: 'complete', emails: [email1, email2, email3] },
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(events.map(serializeEvent)))

    const days: number[] = []
    await CampaignService.generateEmailsStream('https://example.com', 'page', config, (e) => {
      if (e.type === 'email') days.push(e.email.day)
    })

    expect(days).toEqual([1, 2, 3])
  })

  it('handles multiple events in a single chunk', async () => {
    const events: GenerateEmailsStreamEvent[] = [
      { type: 'start', total: 1 },
      { type: 'email', email: { ...email1, uuid: null } },
      { type: 'complete', emails: [email1] },
    ]
    const singleChunk = events.map(serializeEvent).join('')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse([singleChunk]))

    const received: GenerateEmailsStreamEvent[] = []
    const result = await CampaignService.generateEmailsStream(
      'https://example.com',
      'page',
      { ...config, days: 1 },
      (e) => received.push(e),
    )
    expect(received).toHaveLength(3)
    expect(result).toHaveLength(1)
  })

  it('handles a single event split across multiple chunks', async () => {
    const full = JSON.stringify({ type: 'complete', emails: [email1] }) + '\n'
    const mid = Math.floor(full.length / 2)
    const startEvent = JSON.stringify({ type: 'start', total: 1 }) + '\n'

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      makeStreamResponse([startEvent, full.slice(0, mid), full.slice(mid)]),
    )

    const received: GenerateEmailsStreamEvent[] = []
    const result = await CampaignService.generateEmailsStream(
      'https://example.com',
      'page',
      { ...config, days: 1 },
      (e) => received.push(e),
    )
    expect(received.map((e) => e.type)).toEqual(['start', 'complete'])
    expect(result).toHaveLength(1)
  })

  it('skips malformed JSON lines without aborting the stream', async () => {
    const chunks = [
      'this is not json\n',
      serializeEvent({ type: 'start', total: 1 }),
      '{broken\n',
      serializeEvent({ type: 'complete', emails: [email1] }),
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(chunks))

    const received: GenerateEmailsStreamEvent[] = []
    const result = await CampaignService.generateEmailsStream(
      'https://example.com',
      'page',
      { ...config, days: 1 },
      (e) => received.push(e),
    )
    expect(received.map((e) => e.type)).toEqual(['start', 'complete'])
    expect(result).toHaveLength(1)
  })

  it('throws when stream closes without a complete event', async () => {
    const chunks = [serializeEvent({ type: 'start', total: 3 })]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(chunks))

    await expect(
      CampaignService.generateEmailsStream('https://example.com', 'page', config, () => {}),
    ).rejects.toThrow(/stream closed/i)
  })

  it('throws with the error message when an error event arrives', async () => {
    const chunks = [
      serializeEvent({ type: 'start', total: 3 }),
      serializeEvent({ type: 'error', message: 'openai exploded' }),
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(chunks))

    await expect(
      CampaignService.generateEmailsStream('https://example.com', 'page', config, () => {}),
    ).rejects.toThrow('openai exploded')
  })

  it('throws server message on non-OK response (no stream)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(
      CampaignService.generateEmailsStream('https://example.com', 'page', config, () => {}),
    ).rejects.toThrow(/too many requests/i)
  })

  it('falls back to generic message when error body has no message field', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('null', { status: 500, headers: { 'Content-Type': 'application/json' } }),
    )
    await expect(
      CampaignService.generateEmailsStream('https://example.com', 'page', config, () => {}),
    ).rejects.toThrow(/failed to generate emails/i)
  })

  it('skips events that fail schema validation', async () => {
    const chunks = [
      serializeEvent({ type: 'start', total: 3 }),
      // intentionally malformed event — missing required fields on email
      JSON.stringify({ type: 'email', email: { day: 1 } }) + '\n',
      serializeEvent({ type: 'complete', emails: [email1] }),
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(chunks))

    const received: GenerateEmailsStreamEvent[] = []
    const result = await CampaignService.generateEmailsStream(
      'https://example.com',
      'page',
      { ...config, days: 1 },
      (e) => received.push(e),
    )
    expect(received.map((e) => e.type)).toEqual(['start', 'complete'])
    expect(result).toHaveLength(1)
  })

  it('passes campaignId, landingAnalysis, landingContent, and config in POST body', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        makeStreamResponse([serializeEvent({ type: 'complete', emails: [email1] })]),
      )

    await CampaignService.generateEmailsStream(
      'https://example.com/x',
      'the page content',
      config,
      () => {},
      {
        campaignId: 'abcd',
        landingAnalysis: {
          valueProp: 'v',
          targetAudience: 't',
          primaryCTA: 'p',
          toneFingerprint: 'tf',
          objections: [],
          proofPoints: [],
          angles: ['a'],
          opportunities: [],
        },
      },
    )

    const [, init] = fetchMock.mock.calls[0]
    expect(init?.method).toBe('POST')
    const body = JSON.parse(init?.body as string)
    expect(body.landingUrl).toBe('https://example.com/x')
    expect(body.landingContent).toBe('the page content')
    expect(body.config).toEqual(config)
    expect(body.campaignId).toBe('abcd')
    expect(body.landingAnalysis.valueProp).toBe('v')
  })

  it('omits campaignId from body when not provided', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        makeStreamResponse([serializeEvent({ type: 'complete', emails: [email1] })]),
      )

    await CampaignService.generateEmailsStream('https://example.com/x', 'page', config, () => {})

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init?.body as string)
    expect(body.campaignId).toBeUndefined()
  })

  it('exposes the optional warning from a complete event', async () => {
    const events: GenerateEmailsStreamEvent[] = [
      { type: 'start', total: 1 },
      { type: 'email', email: { ...email1, uuid: null } },
      { type: 'complete', emails: [email1], warning: 'Could not persist emails' },
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(events.map(serializeEvent)))

    const received: GenerateEmailsStreamEvent[] = []
    await CampaignService.generateEmailsStream(
      'https://example.com',
      'page',
      { ...config, days: 1 },
      (e) => received.push(e),
    )

    const completeEvent = received.find((e) => e.type === 'complete')
    expect(completeEvent).toBeDefined()
    if (completeEvent && completeEvent.type === 'complete') {
      expect(completeEvent.warning).toBe('Could not persist emails')
    }
  })

  it('forwards AbortSignal to fetch', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        makeStreamResponse([serializeEvent({ type: 'complete', emails: [email1] })]),
      )

    const ctrl = new AbortController()
    await CampaignService.generateEmailsStream('https://example.com', 'page', config, () => {}, {
      signal: ctrl.signal,
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(init?.signal).toBe(ctrl.signal)
  })
})
