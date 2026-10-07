// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'

const streamMock = vi.fn()
const constructorMock = vi.fn()

vi.mock('@anthropic-ai/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@anthropic-ai/sdk')>()
  const Real = actual.default
  // Only the client is faked; the error classes stay real so `instanceof`
  // checks in lib/ai.ts behave exactly as in production.
  class MockAnthropic {
    static APIError = Real.APIError
    static RateLimitError = Real.RateLimitError
    beta = { messages: { stream: (...args: unknown[]) => streamMock(...args) } }
    constructor(options: unknown) {
      constructorMock(options)
    }
  }
  return { ...actual, default: MockAnthropic }
})

import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL, generateStructured, extractRateLimitInfo, isRateLimitError } from '@/lib/ai'

interface FakeMessage {
  content: Array<Record<string, unknown>>
  stop_reason: string
}

function respondWith(message: FakeMessage) {
  streamMock.mockReturnValue({ finalMessage: async () => message })
}

function textMessage(text: string, stop_reason = 'end_turn'): FakeMessage {
  return { content: [{ type: 'text', text }], stop_reason }
}

const schema = z.object({
  name: z.string().trim().min(1),
  tags: z.array(z.string()).default([]),
  nested: z.object({ ok: z.boolean() }),
})

const baseRequest = {
  system: 'You are a test.',
  messages: [{ role: 'user' as const, content: 'Hello' }],
  schema,
}

function lastRequest(): Record<string, unknown> {
  return streamMock.mock.calls.at(-1)![0] as Record<string, unknown>
}

function rateLimitError(headers: Record<string, string> = {}) {
  return new Anthropic.RateLimitError(
    429,
    { type: 'error', error: { type: 'rate_limit_error', message: 'Slow down' } },
    'Slow down',
    new Headers(headers),
  )
}

describe('generateStructured', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    streamMock.mockReset()
    respondWith(textMessage(JSON.stringify({ name: 'Acme', nested: { ok: true } })))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns zod-parsed data with transforms and defaults applied', async () => {
    respondWith(textMessage(JSON.stringify({ name: '  Acme  ', nested: { ok: true } })))

    const result = await generateStructured(baseRequest)

    expect(result).toEqual({ name: 'Acme', tags: [], nested: { ok: true } })
  })

  it('joins text blocks and ignores non-text blocks (thinking, fallback markers)', async () => {
    respondWith({
      content: [
        { type: 'thinking', thinking: '' },
        { type: 'text', text: '{"name":"Ac' },
        { type: 'fallback', from: { model: 'a' }, to: { model: 'b' } },
        { type: 'text', text: 'me","nested":{"ok":false}}' },
      ],
      stop_reason: 'end_turn',
    })

    const result = await generateStructured(baseRequest)

    expect(result).toEqual({ name: 'Acme', tags: [], nested: { ok: false } })
  })

  it('sends model, fallbacks, cached system prompt and defaults', async () => {
    await generateStructured(baseRequest)

    const req = lastRequest()
    expect(CLAUDE_MODEL).toBe('claude-sonnet-5-5')
    expect(req.model).toBe('claude-sonnet-5-5')
    expect(req.betas).toEqual(['server-side-fallback-2026-07-01'])
    expect(req.fallbacks).toBe('default')
    expect(req.max_tokens).toBe(32000)
    expect(req.system).toEqual([
      { type: 'text', text: 'You are a test.', cache_control: { type: 'ephemeral' } },
    ])
    expect(req.messages).toEqual(baseRequest.messages)
    expect(req.output_config).toMatchObject({ effort: 'medium' })
  })

  it('passes custom effort and maxTokens through', async () => {
    await generateStructured({ ...baseRequest, effort: 'low', maxTokens: 8000 })

    const req = lastRequest()
    expect(req.max_tokens).toBe(8000)
    expect(req.output_config).toMatchObject({ effort: 'low' })
  })

  it('sends a closed JSON schema built from the zod schema', async () => {
    await generateStructured(baseRequest)

    const format = (lastRequest().output_config as { format: Record<string, unknown> }).format
    expect(format.type).toBe('json_schema')

    const json = format.schema as {
      type: string
      additionalProperties: boolean
      properties: Record<string, { additionalProperties?: boolean; minLength?: number }>
      $schema?: string
    }
    expect(json.type).toBe('object')
    expect(json.additionalProperties).toBe(false)
    expect(json.properties.nested.additionalProperties).toBe(false)
    expect(Object.keys(json.properties)).toEqual(['name', 'tags', 'nested'])
    expect(json.$schema).toBeUndefined()
    // Constraints structured outputs can't enforce are moved out of the schema;
    // the zod parse still enforces them (see the empty-name test below).
    expect(json.properties.name.minLength).toBeUndefined()
  })

  it('reuses the converted JSON schema for the same zod schema', async () => {
    await generateStructured(baseRequest)
    await generateStructured(baseRequest)

    const [first, second] = streamMock.mock.calls.map(
      (call) => (call[0] as { output_config: { format: { schema: unknown } } }).output_config,
    )
    expect(second.format.schema).toBe(first.format.schema)
  })

  it('throws on a refusal stop_reason without parsing the content', async () => {
    respondWith(textMessage('{"name":"Acme","nested":{"ok":true}}', 'refusal'))

    await expect(generateStructured(baseRequest)).rejects.toThrow(/declined/)
  })

  it('throws when the response was cut off at max_tokens', async () => {
    respondWith(textMessage('{"name":"Ac', 'max_tokens'))

    await expect(generateStructured(baseRequest)).rejects.toThrow(/cut off/)
  })

  it('throws when the response has no text', async () => {
    respondWith({ content: [], stop_reason: 'end_turn' })

    await expect(generateStructured(baseRequest)).rejects.toThrow(/No response/)
  })

  it('throws a plain Error (not a ZodError) on malformed JSON', async () => {
    respondWith(textMessage('not json {'))

    const error = await generateStructured(baseRequest).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(z.ZodError)
    expect((error as Error).message).toMatch(/malformed JSON/)
  })

  it('throws a plain Error (not a ZodError) when the JSON does not match the schema', async () => {
    respondWith(textMessage(JSON.stringify({ name: 42, nested: { ok: 'yes' } })))

    const error = await generateStructured(baseRequest).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(z.ZodError)
    expect((error as Error).message).toMatch(/unexpected format/)
  })

  it('enforces zod-only constraints such as min(1) after trim', async () => {
    respondWith(textMessage(JSON.stringify({ name: '   ', nested: { ok: true } })))

    await expect(generateStructured(baseRequest)).rejects.toThrow(/unexpected format/)
  })

  it('throws before calling the API when ANTHROPIC_API_KEY is unset', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', undefined)

    await expect(generateStructured(baseRequest)).rejects.toThrow(/ANTHROPIC_API_KEY/)
    expect(streamMock).not.toHaveBeenCalled()
  })

  it('creates a single client with SDK retries enabled', async () => {
    await generateStructured(baseRequest)
    await generateStructured(baseRequest)

    // The client is cached at module level, so across this whole file it is
    // constructed exactly once (constructorMock is never reset).
    expect(constructorMock).toHaveBeenCalledTimes(1)
    expect(constructorMock).toHaveBeenCalledWith({ maxRetries: 3 })
  })

  it('propagates SDK errors such as rate limits unchanged', async () => {
    const error = rateLimitError()
    streamMock.mockReturnValue({ finalMessage: () => Promise.reject(error) })

    await expect(generateStructured(baseRequest)).rejects.toBe(error)
  })
})

describe('extractRateLimitInfo', () => {
  it('reads the anthropic rate-limit headers from an API error', () => {
    const error = rateLimitError({
      'anthropic-ratelimit-requests-limit': '50',
      'anthropic-ratelimit-requests-remaining': '0',
      'anthropic-ratelimit-requests-reset': '2026-10-07T12:00:00Z',
    })

    expect(extractRateLimitInfo(error)).toEqual({
      limit: 50,
      remaining: 0,
      resetTime: '2026-10-07T12:00:00Z',
    })
  })

  it('returns undefined fields when the headers are missing', () => {
    expect(extractRateLimitInfo(rateLimitError())).toEqual({
      limit: undefined,
      remaining: undefined,
      resetTime: undefined,
    })
  })

  it('returns an empty object for non-SDK errors', () => {
    expect(extractRateLimitInfo(new Error('boom'))).toEqual({})
    expect(extractRateLimitInfo({ status: 429, headers: {} })).toEqual({})
    expect(extractRateLimitInfo(undefined)).toEqual({})
  })
})

describe('isRateLimitError', () => {
  it('is true only for the SDK RateLimitError', () => {
    expect(isRateLimitError(rateLimitError())).toBe(true)
    expect(isRateLimitError(new Anthropic.APIError(500, undefined, 'boom', new Headers()))).toBe(
      false,
    )
    expect(isRateLimitError({ status: 429 })).toBe(false)
    expect(isRateLimitError(new Error('Rate limit exceeded'))).toBe(false)
  })
})
