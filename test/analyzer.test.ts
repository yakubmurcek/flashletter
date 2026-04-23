import { describe, it, expect, vi, beforeEach } from 'vitest'

const parseMock = vi.fn()

vi.mock('@/lib/openai', () => ({
  openai: {
    responses: {
      parse: (...args: unknown[]) => parseMock(...args),
    },
  },
}))

// Import AFTER vi.mock so analyzer.ts sees the mock
import { analyzeLandingPage } from '@/lib/utils/analyzer'

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

describe('analyzeLandingPage', () => {
  beforeEach(() => {
    parseMock.mockReset()
  })

  it('returns the parsed analysis on success', async () => {
    parseMock.mockResolvedValue({ output_parsed: validAnalysis })

    const result = await analyzeLandingPage({
      url: 'https://example.com',
      content: 'Some content',
      metadata: { title: 'Example' },
    })

    expect(result).toEqual(validAnalysis)
    expect(parseMock).toHaveBeenCalledOnce()
  })

  it('throws when OpenAI returns output_parsed=null', async () => {
    parseMock.mockResolvedValue({ output_parsed: null })
    await expect(
      analyzeLandingPage({
        url: 'https://example.com',
        content: 'c',
        metadata: {},
      }),
    ).rejects.toThrow(/no analysis/i)
  })

  it('uses gpt-5-mini (not gpt-4o)', async () => {
    parseMock.mockResolvedValue({ output_parsed: validAnalysis })
    await analyzeLandingPage({ url: 'https://example.com', content: 'c', metadata: {} })
    const callArg = parseMock.mock.calls[0][0] as { model: string }
    expect(callArg.model).toBe('gpt-5-mini')
  })

  it('sends URL + title in the user input', async () => {
    parseMock.mockResolvedValue({ output_parsed: validAnalysis })
    await analyzeLandingPage({
      url: 'https://acme.io',
      content: 'Acme rocks.',
      metadata: { title: 'Acme Home', ogSiteName: 'Acme Inc' },
    })
    const callArg = parseMock.mock.calls[0][0] as {
      input: Array<{ role: string; content: string }>
    }
    const userInput = callArg.input.find((m) => m.role === 'user')!.content
    expect(userInput).toContain('https://acme.io')
    expect(userInput).toContain('Acme Home')
    expect(userInput).toContain('Acme Inc')
    expect(userInput).toContain('Acme rocks.')
  })

  it('prefers ogTitle over title in user input', async () => {
    parseMock.mockResolvedValue({ output_parsed: validAnalysis })
    await analyzeLandingPage({
      url: 'https://example.com',
      content: 'c',
      metadata: { title: 'Plain', ogTitle: 'OG Title' },
    })
    const callArg = parseMock.mock.calls[0][0] as {
      input: Array<{ role: string; content: string }>
    }
    const userInput = callArg.input.find((m) => m.role === 'user')!.content
    expect(userInput).toContain('OG Title')
    expect(userInput).not.toContain('Title: Plain')
  })

  it('uses "Untitled page" when no title metadata', async () => {
    parseMock.mockResolvedValue({ output_parsed: validAnalysis })
    await analyzeLandingPage({ url: 'https://example.com', content: 'c', metadata: {} })
    const callArg = parseMock.mock.calls[0][0] as {
      input: Array<{ role: string; content: string }>
    }
    const userInput = callArg.input.find((m) => m.role === 'user')!.content
    expect(userInput).toContain('Untitled page')
  })

  it('truncates long content (>8000 chars)', async () => {
    parseMock.mockResolvedValue({ output_parsed: validAnalysis })
    const bigContent = 'x'.repeat(15000) + 'END_MARKER'
    await analyzeLandingPage({
      url: 'https://example.com',
      content: bigContent,
      metadata: {},
    })
    const callArg = parseMock.mock.calls[0][0] as {
      input: Array<{ role: string; content: string }>
    }
    const userInput = callArg.input.find((m) => m.role === 'user')!.content
    expect(userInput).not.toContain('END_MARKER')
    // Hard upper bound: truncated content + framing, well under 10k
    expect(userInput.length).toBeLessThan(10000)
  })

  it('sends a system message with email-copywriting rules', async () => {
    parseMock.mockResolvedValue({ output_parsed: validAnalysis })
    await analyzeLandingPage({ url: 'https://example.com', content: 'c', metadata: {} })
    const callArg = parseMock.mock.calls[0][0] as {
      input: Array<{ role: string; content: string }>
    }
    const systemInput = callArg.input.find((m) => m.role === 'system')!.content
    expect(systemInput.toLowerCase()).toContain('landing pages')
    expect(systemInput.toLowerCase()).toMatch(/never invent/)
  })

  it('does not pass temperature (GPT-5 family rejects it on structured output)', async () => {
    parseMock.mockResolvedValue({ output_parsed: validAnalysis })
    await analyzeLandingPage({ url: 'https://example.com', content: 'c', metadata: {} })
    const callArg = parseMock.mock.calls[0][0] as Record<string, unknown>
    expect('temperature' in callArg).toBe(false)
  })
})
