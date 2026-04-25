import { describe, it, expect } from 'vitest'
import {
  buildInstructions,
  getCampaignStructure,
  getToneGuidelines,
} from '@/app/api/generate-emails/prompts'
import type { LandingPageAnalysis } from '@/lib/schemas/analysis'

const analysis: LandingPageAnalysis = {
  valueProp: 'Turn landing pages into email sequences.',
  targetAudience: 'Solo SaaS founders.',
  primaryCTA: 'Start free trial',
  toneFingerprint: 'Direct, casual, uses "you", short sentences.',
  objections: ['Is this generic AI?', 'How is this different from Mailchimp?'],
  proofPoints: ['1,200+ founders', 'Featured on Product Hunt'],
  angles: ['Save time', 'Convert more', 'Feel like a real marketer'],
  opportunities: ["Page doesn't mention pricing"],
}

describe('getCampaignStructure', () => {
  it('returns nurture structure for nurture', () => {
    const result = getCampaignStructure('nurture', 7)
    expect(result).toContain('Day 1')
    expect(result).toContain('Welcome')
  })

  it('returns onboarding structure for onboarding', () => {
    const result = getCampaignStructure('onboarding', 7)
    expect(result).toContain('Getting started guide')
    expect(result).toContain('Advanced features')
  })

  it('returns promotional structure for promotional', () => {
    const result = getCampaignStructure('promotional', 7)
    expect(result).toContain('urgency')
    expect(result).toContain('objections')
  })

  it('falls back to nurture for unknown type', () => {
    const result = getCampaignStructure('wizardry', 7)
    expect(result).toEqual(getCampaignStructure('nurture', 7))
  })

  it('scales day numbers with duration', () => {
    const result = getCampaignStructure('nurture', 14)
    expect(result).toContain('Day 14')
  })
})

describe('getToneGuidelines', () => {
  it('returns professional guidelines', () => {
    expect(getToneGuidelines('professional')).toContain('Formal')
  })

  it('returns friendly guidelines', () => {
    expect(getToneGuidelines('friendly')).toContain('Conversational')
  })

  it('returns enthusiastic guidelines', () => {
    expect(getToneGuidelines('enthusiastic')).toContain('Energetic')
  })

  it('returns casual guidelines', () => {
    expect(getToneGuidelines('casual')).toContain('Relaxed')
  })

  it('falls back to friendly for unknown tone', () => {
    expect(getToneGuidelines('unknown-tone')).toEqual(getToneGuidelines('friendly'))
  })
})

describe('buildInstructions (without analysis)', () => {
  const config = { days: 5, campaignType: 'nurture', tone: 'friendly' }
  const prompt = buildInstructions(config, 'https://example.com', 'Page content here')

  it('includes the landing URL', () => {
    expect(prompt).toContain('https://example.com')
  })

  it('includes the campaign type + day count in header', () => {
    expect(prompt).toContain('5-day nurture')
  })

  it('includes the tone', () => {
    expect(prompt).toContain('friendly')
  })

  it('includes the landing content', () => {
    expect(prompt).toContain('Page content here')
  })

  it('truncates landing content at 2000 chars', () => {
    const sentinel = '\u2603' // snowman — doesn't appear elsewhere in the prompt
    const longContent = sentinel.repeat(3000) + 'TAIL_MARKER'
    const p = buildInstructions(config, 'https://e.com', longContent)
    const count = (p.match(/\u2603/g) || []).length
    expect(count).toBe(2000)
    expect(p).not.toContain('TAIL_MARKER')
  })

  it('does not include analysis block when analysis is undefined', () => {
    expect(prompt).not.toContain('LANDING PAGE ANALYSIS')
    expect(prompt).not.toContain('Voice fingerprint')
  })

  it('always includes anti-hallucination rule', () => {
    expect(prompt.toLowerCase()).toMatch(/do not invent/i)
  })

  it('returns a JSON schema shape instruction', () => {
    expect(prompt).toContain('"emails"')
    expect(prompt).toContain('"day"')
    expect(prompt).toContain('"subject"')
  })
})

describe('buildInstructions (with analysis)', () => {
  const config = { days: 7, campaignType: 'promotional', tone: 'enthusiastic' }
  const prompt = buildInstructions(config, 'https://example.com', 'content', analysis)

  it('includes the LANDING PAGE ANALYSIS header', () => {
    expect(prompt).toContain('LANDING PAGE ANALYSIS')
  })

  it('includes the value proposition verbatim', () => {
    expect(prompt).toContain(analysis.valueProp)
  })

  it('includes the target audience verbatim', () => {
    expect(prompt).toContain(analysis.targetAudience)
  })

  it('includes the primary CTA', () => {
    expect(prompt).toContain(analysis.primaryCTA)
  })

  it('includes the voice fingerprint', () => {
    expect(prompt).toContain(analysis.toneFingerprint)
  })

  it('includes all proof points verbatim', () => {
    for (const point of analysis.proofPoints) {
      expect(prompt).toContain(point)
    }
  })

  it('includes all objections', () => {
    for (const obj of analysis.objections) {
      expect(prompt).toContain(obj)
    }
  })

  it('includes all angles', () => {
    for (const angle of analysis.angles) {
      expect(prompt).toContain(angle)
    }
  })

  it('includes all opportunities', () => {
    for (const opp of analysis.opportunities) {
      expect(prompt).toContain(opp)
    }
  })

  it('contains the rule that every email must drive to primary CTA', () => {
    expect(prompt.toLowerCase()).toMatch(/primary cta/)
    expect(prompt.toLowerCase()).toMatch(/consistent with the primary cta/)
  })

  it('contains the rule about matching voice fingerprint', () => {
    expect(prompt.toLowerCase()).toMatch(/match the voice fingerprint/)
  })

  it('contains the rule about rotating angles', () => {
    expect(prompt.toLowerCase()).toMatch(/rotate|vary/)
  })

  it('contains the rule about citing proof verbatim', () => {
    expect(prompt.toLowerCase()).toMatch(/cite.*(verbatim|proof)/)
  })

  it('explicitly forbids making up stats', () => {
    expect(prompt.toLowerCase()).toMatch(/do not.*(make|invent)/)
  })
})

describe('buildInstructions (empty list fields in analysis)', () => {
  const emptyAnalysis: LandingPageAnalysis = {
    ...analysis,
    proofPoints: [],
    objections: [],
    angles: [],
    opportunities: [],
  }
  const prompt = buildInstructions(
    { days: 5, campaignType: 'nurture', tone: 'friendly' },
    'https://example.com',
    'content',
    emptyAnalysis,
  )

  it('includes the empty-proof note instead of inventing proof', () => {
    expect(prompt).toMatch(/No concrete proof/i)
  })

  it('handles empty objections with a note', () => {
    expect(prompt).toMatch(/None detected/i)
  })

  it('still includes the non-list analysis fields', () => {
    expect(prompt).toContain(emptyAnalysis.valueProp)
    expect(prompt).toContain(emptyAnalysis.primaryCTA)
  })
})
