import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { boundedArray } from '@/lib/schemas/bounded-array'
import { generateEmailsRequestSchema } from '@/lib/schemas/api'
import { chatRequestSchema } from '@/lib/schemas'

const analysis = {
  valueProp: 'v',
  targetAudience: 't',
  primaryCTA: 'c',
  toneFingerprint: 'f',
  objections: [],
  proofPoints: [],
  angles: [],
  opportunities: [],
}

describe('boundedArray', () => {
  const schema = boundedArray(z.string(), 3)

  it('accepts an array within the cap and validates its items', () => {
    expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
    expect(schema.safeParse(['a', 1]).success).toBe(false)
  })

  it('rejects a non-array', () => {
    expect(schema.safeParse('a').success).toBe(false)
  })

  it('rejects an oversized array with one issue, without reading its items', () => {
    // GHSA-mrhx-c7xc-m3w5: plain z.array().max() would still build one issue per item.
    const result = schema.safeParse(Array(200_000).fill(1))
    expect(result.success).toBe(false)
    expect(result.error?.issues).toHaveLength(1)
  })
})

describe('request schemas cap client-sent arrays', () => {
  it('generate-emails: an analysis list of junk fails with a single issue', () => {
    const result = generateEmailsRequestSchema.safeParse({
      landingUrl: 'https://example.com',
      config: { tone: 'friendly', campaignType: 'welcome', days: 5 },
      landingAnalysis: { ...analysis, objections: Array(100_000).fill(1) },
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues).toHaveLength(1)
    expect(result.error?.issues[0].path).toEqual(['landingAnalysis', 'objections'])
  })

  it('generate-emails: a normal edited analysis still passes and blanks are dropped', () => {
    const result = generateEmailsRequestSchema.parse({
      landingUrl: 'https://example.com',
      config: { tone: 'friendly', campaignType: 'welcome', days: 5 },
      landingAnalysis: { ...analysis, angles: ['one', ' ', 'two'] },
    })
    expect(result.landingAnalysis?.angles).toEqual(['one', 'two'])
  })

  it('chat: an oversized message list fails with a single issue', () => {
    const result = chatRequestSchema.safeParse({ messages: Array(100_000).fill(1) })
    expect(result.success).toBe(false)
    expect(result.error?.issues).toHaveLength(1)
  })

  it('chat: a normal conversation still passes', () => {
    const messages = [{ role: 'user', content: 'Make it shorter' }]
    expect(chatRequestSchema.parse({ messages }).messages).toEqual(messages)
  })
})
