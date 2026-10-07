import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateStructuredMock = vi.fn()

vi.mock('@/lib/ai', () => ({
  generateStructured: (...args: unknown[]) => generateStructuredMock(...args),
}))

// Import AFTER vi.mock so analyzer.ts sees the mock
import { analyzeLandingPage } from '@/lib/utils/analyzer'
import { landingPageAnalysisSchema } from '@/lib/schemas/analysis'

const validAnalysis = {
  valueProp: 'a',
  targetAudience: 'b',
  primaryCTA: 'c',
  toneFingerprint: 'd',
  objections: [],
  proofPoints: [],
  angles: ['x'],
  opportunities: [],
}

interface GenerateCall {
  system: string
  messages: Array<{ role: string; content: string }>
  schema: unknown
  effort?: string
  maxTokens?: number
}

function lastCall(): GenerateCall {
  return generateStructuredMock.mock.calls.at(-1)![0] as GenerateCall
}

function userInput(): string {
  return lastCall().messages.find((m) => m.role === 'user')!.content
}

describe('analyzeLandingPage', () => {
  beforeEach(() => {
    generateStructuredMock.mockReset().mockResolvedValue(validAnalysis)
  })

  it('returns the structured analysis on success', async () => {
    const result = await analyzeLandingPage({
      url: 'https://example.com',
      content: 'Some content',
      metadata: { title: 'Example' },
    })

    expect(result).toEqual(validAnalysis)
    expect(generateStructuredMock).toHaveBeenCalledOnce()
  })

  it('propagates errors from the AI call', async () => {
    generateStructuredMock.mockRejectedValue(new Error('AI returned an unexpected format'))
    await expect(
      analyzeLandingPage({
        url: 'https://example.com',
        content: 'c',
        metadata: {},
      }),
    ).rejects.toThrow(/unexpected format/)
  })

  it('validates against landingPageAnalysisSchema at the default effort', async () => {
    await analyzeLandingPage({ url: 'https://example.com', content: 'c', metadata: {} })
    const call = lastCall()
    expect(call.schema).toBe(landingPageAnalysisSchema)
    expect(call.effort).toBeUndefined()
    expect(call.maxTokens).toBe(8000)
  })

  it('sends a single user message', async () => {
    await analyzeLandingPage({ url: 'https://example.com', content: 'c', metadata: {} })
    const { messages } = lastCall()
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
  })

  it('sends URL + title in the user input', async () => {
    await analyzeLandingPage({
      url: 'https://acme.io',
      content: 'Acme rocks.',
      metadata: { title: 'Acme Home', ogSiteName: 'Acme Inc' },
    })
    const input = userInput()
    expect(input).toContain('https://acme.io')
    expect(input).toContain('Acme Home')
    expect(input).toContain('Acme Inc')
    expect(input).toContain('Acme rocks.')
  })

  it('prefers ogTitle over title in user input', async () => {
    await analyzeLandingPage({
      url: 'https://example.com',
      content: 'c',
      metadata: { title: 'Plain', ogTitle: 'OG Title' },
    })
    const input = userInput()
    expect(input).toContain('OG Title')
    expect(input).not.toContain('Title: Plain')
  })

  it('uses "Untitled page" when no title metadata', async () => {
    await analyzeLandingPage({ url: 'https://example.com', content: 'c', metadata: {} })
    expect(userInput()).toContain('Untitled page')
  })

  it('truncates long content (>8000 chars)', async () => {
    const bigContent = 'x'.repeat(15000) + 'END_MARKER'
    await analyzeLandingPage({
      url: 'https://example.com',
      content: bigContent,
      metadata: {},
    })
    const input = userInput()
    expect(input).not.toContain('END_MARKER')
    // Hard upper bound: truncated content + framing, well under 10k
    expect(input.length).toBeLessThan(10000)
  })

  it('sends a system prompt with email-copywriting rules', async () => {
    await analyzeLandingPage({ url: 'https://example.com', content: 'c', metadata: {} })
    const { system } = lastCall()
    expect(system.toLowerCase()).toContain('landing pages')
    expect(system.toLowerCase()).toMatch(/never invent/)
  })
})
