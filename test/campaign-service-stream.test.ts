import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CampaignService } from '@/lib/services/campaign.service'
import type { ScrapeStreamEvent } from '@/lib/types/scrape-progress'

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

function serializeEvent(event: ScrapeStreamEvent): string {
  return JSON.stringify(event) + '\n'
}

const validCompleteData = {
  content: '<p>Hi</p>',
  metadata: { title: 'Hi' },
  url: 'https://example.com',
  stats: { wordCount: 1, extractionMethod: 'static' as const, cached: false },
}

describe('CampaignService.scrapeLandingPageStream', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses a complete event and returns LandingPageData', async () => {
    const events: ScrapeStreamEvent[] = [
      { type: 'stage', stageId: 'connecting' },
      { type: 'stage', stageId: 'fetching' },
      { type: 'complete', data: validCompleteData },
    ]
    const chunks = events.map(serializeEvent)

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(chunks))

    const received: ScrapeStreamEvent[] = []
    const result = await CampaignService.scrapeLandingPageStream('https://example.com', (e) =>
      received.push(e),
    )

    expect(received.map((e) => e.type)).toEqual(['stage', 'stage', 'complete'])
    expect(result.url).toBe('https://example.com')
    expect(result.content).toBe('<p>Hi</p>')
  })

  it('fires onEvent in event order', async () => {
    const events: ScrapeStreamEvent[] = [
      { type: 'stage', stageId: 'connecting' },
      { type: 'stage', stageId: 'fetching' },
      { type: 'stage', stageId: 'extracting' },
      { type: 'stage', stageId: 'analyzing' },
      { type: 'stage', stageId: 'synthesizing' },
      { type: 'complete', data: validCompleteData },
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(events.map(serializeEvent)))

    const received: string[] = []
    await CampaignService.scrapeLandingPageStream('https://example.com', (e) => {
      if (e.type === 'stage') received.push(e.stageId)
    })

    expect(received).toEqual(['connecting', 'fetching', 'extracting', 'analyzing', 'synthesizing'])
  })

  it('handles multiple events arriving in a single chunk', async () => {
    const events: ScrapeStreamEvent[] = [
      { type: 'stage', stageId: 'connecting' },
      { type: 'stage', stageId: 'fetching' },
      { type: 'complete', data: validCompleteData },
    ]
    const singleChunk = events.map(serializeEvent).join('')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse([singleChunk]))

    const received: ScrapeStreamEvent[] = []
    const result = await CampaignService.scrapeLandingPageStream('https://example.com', (e) =>
      received.push(e),
    )
    expect(received).toHaveLength(3)
    expect(result.url).toBe('https://example.com')
  })

  it('handles a single event split across multiple chunks', async () => {
    const full = JSON.stringify({ type: 'complete', data: validCompleteData }) + '\n'
    const mid = Math.floor(full.length / 2)
    const chunks = [full.slice(0, mid), full.slice(mid)]

    // Prepend a stage event split oddly too
    const stagePart1 = JSON.stringify({ type: 'stage', stageId: 'connecting' }).slice(0, 10)
    const stagePart2 = JSON.stringify({ type: 'stage', stageId: 'connecting' }).slice(10) + '\n'

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      makeStreamResponse([stagePart1, stagePart2, ...chunks]),
    )

    const received: ScrapeStreamEvent[] = []
    const result = await CampaignService.scrapeLandingPageStream('https://example.com', (e) =>
      received.push(e),
    )
    expect(received.map((e) => e.type)).toEqual(['stage', 'complete'])
    expect(result.content).toBe('<p>Hi</p>')
  })

  it('skips malformed JSON lines without aborting the stream', async () => {
    const chunks = [
      'this is not json\n',
      serializeEvent({ type: 'stage', stageId: 'connecting' }),
      '{broken\n',
      serializeEvent({ type: 'complete', data: validCompleteData }),
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(chunks))

    const received: ScrapeStreamEvent[] = []
    const result = await CampaignService.scrapeLandingPageStream('https://example.com', (e) =>
      received.push(e),
    )
    expect(received.map((e) => e.type)).toEqual(['stage', 'complete'])
    expect(result).toBeDefined()
  })

  it('throws when stream closes without a complete event', async () => {
    const chunks = [serializeEvent({ type: 'stage', stageId: 'connecting' })]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(chunks))

    await expect(
      CampaignService.scrapeLandingPageStream('https://example.com', () => {}),
    ).rejects.toThrow(/stream closed/i)
  })

  it('throws with error.message when error event arrives', async () => {
    const chunks = [
      serializeEvent({ type: 'stage', stageId: 'connecting' }),
      serializeEvent({ type: 'error', message: 'scrape failed' }),
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(chunks))

    await expect(
      CampaignService.scrapeLandingPageStream('https://example.com', () => {}),
    ).rejects.toThrow('scrape failed')
  })

  it('throws with server message for non-OK response (no stream)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(
      CampaignService.scrapeLandingPageStream('https://example.com', () => {}),
    ).rejects.toThrow(/too many requests/i)
  })

  it('throws generic message on non-OK when body has no error field', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('null', { status: 500, headers: { 'Content-Type': 'application/json' } }),
    )
    await expect(
      CampaignService.scrapeLandingPageStream('https://example.com', () => {}),
    ).rejects.toThrow(/failed to scrape/i)
  })

  it('throws when complete event has invalid data shape', async () => {
    const chunks = [
      serializeEvent({
        type: 'complete',
        // @ts-expect-error — intentionally invalid for this test
        data: { content: 'only this' },
      }),
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(chunks))

    await expect(
      CampaignService.scrapeLandingPageStream('https://example.com', () => {}),
    ).rejects.toThrow(/invalid response|stream closed/i)
  })

  it('includes analysis in returned data when complete event includes it', async () => {
    const chunks = [
      serializeEvent({
        type: 'complete',
        data: {
          ...validCompleteData,
          analysis: {
            valueProp: 'x',
            targetAudience: 'y',
            primaryCTA: 'z',
            toneFingerprint: 't',
            objections: [],
            proofPoints: [],
            angles: ['a'],
            opportunities: [],
          },
        },
      }),
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeStreamResponse(chunks))

    const result = await CampaignService.scrapeLandingPageStream('https://example.com', () => {})
    expect(result.analysis?.valueProp).toBe('x')
  })

  it('passes URL in POST body', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        makeStreamResponse([serializeEvent({ type: 'complete', data: validCompleteData })]),
      )
    await CampaignService.scrapeLandingPageStream('https://example.com/xyz', () => {})

    const [, init] = fetchMock.mock.calls[0]
    expect(init?.method).toBe('POST')
    const body = JSON.parse(init?.body as string)
    expect(body.url).toBe('https://example.com/xyz')
  })
})
