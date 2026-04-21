import { describe, it, expect } from 'vitest'
import { landingPageAnalysisSchema } from '@/lib/schemas/analysis'

const base = {
  valueProp: 'Helps solo SaaS founders build email onboarding.',
  targetAudience: 'Bootstrapped B2B founders under 100 customers.',
  primaryCTA: 'Start free trial',
  toneFingerprint: 'Direct, casual, uses "you" heavily, short sentences.',
  objections: ['Is this another generic AI tool?'],
  proofPoints: ['1,200+ founders', 'Acme Inc. customer'],
  angles: ['Save time', 'Convert more'],
  opportunities: ['No pricing on page'],
}

describe('landingPageAnalysisSchema', () => {
  it('accepts a fully-populated analysis', () => {
    expect(landingPageAnalysisSchema.parse(base)).toEqual(base)
  })

  it('accepts empty arrays for list fields', () => {
    const parsed = landingPageAnalysisSchema.parse({
      ...base,
      objections: [],
      proofPoints: [],
      angles: [],
      opportunities: [],
    })
    expect(parsed.objections).toEqual([])
    expect(parsed.proofPoints).toEqual([])
  })

  it('rejects missing valueProp', () => {
    const { valueProp: _omit, ...rest } = base
    void _omit
    const result = landingPageAnalysisSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing primaryCTA', () => {
    const { primaryCTA: _omit, ...rest } = base
    void _omit
    expect(landingPageAnalysisSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing toneFingerprint', () => {
    const { toneFingerprint: _omit, ...rest } = base
    void _omit
    expect(landingPageAnalysisSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects non-string valueProp', () => {
    expect(landingPageAnalysisSchema.safeParse({ ...base, valueProp: 123 }).success).toBe(false)
  })

  it('rejects non-array objections', () => {
    expect(landingPageAnalysisSchema.safeParse({ ...base, objections: 'one' }).success).toBe(false)
  })

  it('rejects non-string items in proofPoints', () => {
    expect(landingPageAnalysisSchema.safeParse({ ...base, proofPoints: [1, 2] }).success).toBe(
      false,
    )
  })

  it('strips unknown fields by default', () => {
    const parsed = landingPageAnalysisSchema.parse({ ...base, bogus: 'nope' } as unknown)
    expect('bogus' in parsed).toBe(false)
  })

  it('roundtrips through JSON.stringify/parse unchanged', () => {
    const roundtripped = landingPageAnalysisSchema.parse(JSON.parse(JSON.stringify(base)))
    expect(roundtripped).toEqual(base)
  })
})
