import { describe, it, expect } from 'vitest'
import {
  generateEmailsRequestSchema,
  scrapeLandingRequestSchema,
  scrapeLandingResponseSchema,
} from '@/lib/schemas/api'
import { landingPageDataSchema } from '@/lib/schemas'

const validAnalysis = {
  valueProp: 'x',
  targetAudience: 'y',
  primaryCTA: 'z',
  toneFingerprint: 't',
  objections: [],
  proofPoints: [],
  angles: ['a'],
  opportunities: [],
}

describe('scrapeLandingRequestSchema', () => {
  it('accepts a valid URL', () => {
    const parsed = scrapeLandingRequestSchema.parse({ url: 'https://example.com' })
    expect(parsed.url).toBe('https://example.com')
    expect(parsed.useDynamic).toBe(false)
  })

  it('defaults useDynamic to false', () => {
    const parsed = scrapeLandingRequestSchema.parse({ url: 'https://example.com' })
    expect(parsed.useDynamic).toBe(false)
  })

  it('accepts useDynamic=true', () => {
    const parsed = scrapeLandingRequestSchema.parse({
      url: 'https://example.com',
      useDynamic: true,
    })
    expect(parsed.useDynamic).toBe(true)
  })

  it('rejects a non-URL string', () => {
    expect(scrapeLandingRequestSchema.safeParse({ url: 'not a url' }).success).toBe(false)
  })

  it('rejects missing url', () => {
    expect(scrapeLandingRequestSchema.safeParse({}).success).toBe(false)
  })
})

describe('scrapeLandingResponseSchema', () => {
  const baseResponse = {
    content: '<p>Hello</p>',
    metadata: { title: 'Page', ogTitle: 'Page' },
    url: 'https://example.com',
    stats: {
      wordCount: 100,
      extractionMethod: 'static' as const,
      cached: false,
    },
  }

  it('accepts response without analysis', () => {
    const parsed = scrapeLandingResponseSchema.parse(baseResponse)
    expect(parsed.analysis).toBeUndefined()
  })

  it('accepts response with analysis', () => {
    const parsed = scrapeLandingResponseSchema.parse({
      ...baseResponse,
      analysis: validAnalysis,
    })
    expect(parsed.analysis?.valueProp).toBe('x')
  })

  it('requires stats.extractionMethod', () => {
    expect(
      scrapeLandingResponseSchema.safeParse({
        ...baseResponse,
        stats: { wordCount: 1, cached: true },
      }).success,
    ).toBe(false)
  })

  it('rejects unknown extractionMethod', () => {
    expect(
      scrapeLandingResponseSchema.safeParse({
        ...baseResponse,
        stats: { ...baseResponse.stats, extractionMethod: 'wizardry' },
      }).success,
    ).toBe(false)
  })

  it('rejects partial analysis (required fields missing)', () => {
    expect(
      scrapeLandingResponseSchema.safeParse({
        ...baseResponse,
        analysis: { valueProp: 'only this field' },
      }).success,
    ).toBe(false)
  })
})

describe('generateEmailsRequestSchema', () => {
  const base = {
    landingUrl: 'https://example.com',
    config: { tone: 'professional', campaignType: 'nurture', days: 5 },
  }

  it('accepts minimal request', () => {
    const parsed = generateEmailsRequestSchema.parse(base)
    expect(parsed.landingUrl).toBe('https://example.com')
    expect(parsed.landingAnalysis).toBeUndefined()
  })

  it('accepts request with landingAnalysis', () => {
    const parsed = generateEmailsRequestSchema.parse({
      ...base,
      landingAnalysis: validAnalysis,
    })
    expect(parsed.landingAnalysis?.valueProp).toBe('x')
  })

  it('rejects days > 30', () => {
    expect(
      generateEmailsRequestSchema.safeParse({
        ...base,
        config: { ...base.config, days: 31 },
      }).success,
    ).toBe(false)
  })

  it('rejects days < 1', () => {
    expect(
      generateEmailsRequestSchema.safeParse({
        ...base,
        config: { ...base.config, days: 0 },
      }).success,
    ).toBe(false)
  })

  it('rejects non-uuid campaignId', () => {
    expect(
      generateEmailsRequestSchema.safeParse({ ...base, campaignId: 'not-a-uuid' }).success,
    ).toBe(false)
  })

  it('accepts valid uuid campaignId', () => {
    const parsed = generateEmailsRequestSchema.parse({
      ...base,
      campaignId: '12345678-1234-4123-8123-123456789012',
    })
    expect(parsed.campaignId).toBe('12345678-1234-4123-8123-123456789012')
  })
})

describe('landingPageDataSchema', () => {
  it('accepts data with analysis', () => {
    const parsed = landingPageDataSchema.parse({
      url: 'https://example.com',
      analysis: validAnalysis,
    })
    expect(parsed.analysis?.valueProp).toBe('x')
  })

  it('accepts data without analysis', () => {
    const parsed = landingPageDataSchema.parse({ url: 'https://example.com' })
    expect(parsed.analysis).toBeUndefined()
  })

  it('metadata is optional', () => {
    const parsed = landingPageDataSchema.parse({ url: 'https://example.com' })
    expect(parsed.metadata).toBeUndefined()
  })
})

describe('generateEmailsRequestSchema with an edited analysis', () => {
  // Clearing a field on /create/configure used to 400 every later generation.
  it('accepts an analysis with a cleared field and blank list items', () => {
    const parsed = generateEmailsRequestSchema.parse({
      landingUrl: 'https://example.com',
      landingAnalysis: {
        valueProp: '',
        targetAudience: 'Founders',
        primaryCTA: '  ',
        toneFingerprint: 'Direct',
        objections: [],
        proofPoints: ['Used by 1,200 founders', '  '],
        angles: ['Time saved'],
        opportunities: [],
      },
      config: { tone: 'friendly', campaignType: 'nurture', days: 3 },
    })
    expect(parsed.landingAnalysis?.valueProp).toBe('')
    expect(parsed.landingAnalysis?.primaryCTA).toBe('')
    expect(parsed.landingAnalysis?.proofPoints).toEqual(['Used by 1,200 founders'])
  })
})

describe('landingPageDataSchema with an edited analysis', () => {
  it('still loads a stored campaign whose analysis field was cleared', () => {
    const parsed = landingPageDataSchema.safeParse({
      url: 'https://example.com',
      analysis: {
        valueProp: '',
        targetAudience: '',
        primaryCTA: 'Start trial',
        toneFingerprint: '',
        objections: [],
        proofPoints: [],
        angles: [],
        opportunities: [],
      },
    })
    expect(parsed.success).toBe(true)
  })
})
