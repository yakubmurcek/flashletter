import { describe, it, expect } from 'vitest'
import {
  buildInstructions,
  buildFirstEmailInstructions,
  buildRemainingEmailsInstructions,
  getCampaignStructure,
  getToneGuidelines,
} from '@/app/api/generate-emails/prompts'
import type { LandingPageAnalysis } from '@/lib/schemas/analysis'
import { CAMPAIGN_TONES, CAMPAIGN_TYPES } from '@/lib/constants/campaign'

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

  // Every day from 1 to N appears in exactly one phase, in order. The old
  // templates printed "Days 2-1" for a 5-email onboarding sequence.
  it.each(['nurture', 'onboarding', 'promotional'])(
    'plans each day of a %s sequence exactly once',
    (type) => {
      for (let days = 3; days <= 30; days++) {
        const covered: number[] = []
        for (const [, from, to] of getCampaignStructure(type, days).matchAll(
          /Days? (\d+)(?:-(\d+))?:/g,
        )) {
          const start = Number(from)
          const end = to === undefined ? start : Number(to)
          expect(start, `${type} ${days}: Days ${start}-${end}`).toBeLessThan(end + (to ? 0 : 1))
          for (let d = start; d <= end; d++) covered.push(d)
        }
        expect(covered, `${type} ${days}`).toEqual(Array.from({ length: days }, (_, i) => i + 1))
      }
    },
  )
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

  // The tone pickers offer every playbook tone; none may silently fall back.
  it.each(CAMPAIGN_TONES.map((t) => t.value).filter((v) => v !== 'friendly'))(
    'has its own guidelines for the %s tone',
    (tone) => {
      expect(getToneGuidelines(tone)).not.toEqual(getToneGuidelines('friendly'))
    },
  )
})

describe('getCampaignStructure covers every campaign type offered', () => {
  it.each(CAMPAIGN_TYPES.map((t) => t.value).filter((v) => v !== 'nurture'))(
    'has its own plan for %s',
    (type) => {
      expect(getCampaignStructure(type, 5)).not.toEqual(getCampaignStructure('nurture', 5))
    },
  )
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

  it('cuts landing content at 10k chars of visible text', () => {
    const sentinel = '\u2603' // snowman — doesn't appear elsewhere in the prompt
    const longContent = `${sentinel.repeat(12000)}TAIL_MARKER`
    const p = buildInstructions(config, 'https://e.com', longContent)
    const count = (p.match(/\u2603/g) || []).length
    expect(count).toBe(10000)
    expect(p).not.toContain('TAIL_MARKER')
  })

  it('counts text, not markup, so a testimonial after heavy markup reaches the writer', () => {
    const linkWall = Array.from(
      { length: 200 },
      (_, i) => `<p><a href="https://example.com/features/section/item-${i}">Item ${i}</a></p>`,
    ).join('\n')
    expect(linkWall.length).toBeGreaterThan(8000)
    const content = `${linkWall}\n<p>"It saved us 10 hours a week." Jane Doe, TESTIMONIAL_MARKER</p>`

    for (const p of [
      buildInstructions(config, 'https://e.com', content),
      buildFirstEmailInstructions(config, 'https://e.com', content),
      buildRemainingEmailsInstructions(
        config,
        'https://e.com',
        { subject: 's', preview: 'p', content: 'c' },
        content,
      ),
    ]) {
      expect(p).toContain('TESTIMONIAL_MARKER')
      // Links stay available so the CTA can point at a real deeper page.
      expect(p).toContain('href="https://example.com/features/section/item-199"')
    }
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

describe('buildFirstEmailInstructions', () => {
  const config = { days: 5, campaignType: 'nurture', tone: 'friendly' }
  const prompt = buildFirstEmailInstructions(config, 'https://example.com', 'page text', analysis)

  it('signals to write Day 1 only', () => {
    expect(prompt.toLowerCase()).toMatch(/only.*day 1|day 1.*only/i)
  })

  it('mentions that days 2..N will be generated next so day 1 sets the hook', () => {
    expect(prompt.toLowerCase()).toMatch(/days?\s*2-?5|will be generated next|set the hook/i)
  })

  it('includes the landing URL', () => {
    expect(prompt).toContain('https://example.com')
  })

  it('includes the analysis block when analysis is provided', () => {
    expect(prompt).toContain('LANDING PAGE ANALYSIS')
    expect(prompt).toContain(analysis.valueProp)
    expect(prompt).toContain(analysis.primaryCTA)
  })

  it('asks for the single-element array shape', () => {
    expect(prompt).toContain('"day": 1')
    expect(prompt).toContain('"emails"')
  })

  it('forbids invented stats/testimonials', () => {
    expect(prompt.toLowerCase()).toMatch(/do not invent/i)
  })

  it('cuts landing content at 10k chars of visible text', () => {
    const sentinel = '☃'
    const longContent = sentinel.repeat(12000)
    const p = buildFirstEmailInstructions(config, 'https://e.com', longContent)
    const count = (p.match(/☃/g) || []).length
    expect(count).toBe(10000)
  })

  it('omits the analysis block when analysis is undefined', () => {
    const p = buildFirstEmailInstructions(config, 'https://e.com', 'content')
    expect(p).not.toContain('LANDING PAGE ANALYSIS')
  })

  it('preserves the campaign structure for the chosen type', () => {
    expect(prompt).toContain(getCampaignStructure('nurture', 5))
  })
})

describe('analysis block with a cleared field', () => {
  it('tells the model to infer a field the user cleared instead of leaving it blank', () => {
    const prompt = buildRemainingEmailsInstructions(
      { days: 3, campaignType: 'nurture', tone: 'friendly' },
      'https://example.com',
      { subject: 'S', preview: 'P', content: 'C' },
      'page content',
      { ...analysis, valueProp: '' },
    )
    expect(prompt).toMatch(/Value proposition: Not given; infer it from the page content\./)
  })
})

describe('buildRemainingEmailsInstructions', () => {
  const config = { days: 5, campaignType: 'nurture', tone: 'friendly' }
  const firstEmail = {
    subject: 'Welcome to Flashletter',
    preview: "You're in.",
    content: 'Hi there — thanks for joining.',
  }
  const prompt = buildRemainingEmailsInstructions(
    config,
    'https://example.com',
    firstEmail,
    'page content',
    analysis,
  )

  it('says day 1 is already written and not to regenerate it', () => {
    expect(prompt.toLowerCase()).toMatch(/day 1.*(already|not regenerate|do not)/i)
  })

  it('asks for days 2 through N', () => {
    expect(prompt).toMatch(/Days?\s*2\s*(through|to|–|-)\s*5/i)
  })

  it('asks for just its batch when given a day range', () => {
    const batch = buildRemainingEmailsInstructions(
      { ...config, days: 30 },
      'https://example.com',
      firstEmail,
      'page content',
      analysis,
      { from: 12, to: 21 },
    )
    expect(batch).toMatch(/Days 12 through 21/)
    expect(batch).toMatch(/exactly 10 emails/)
    expect(batch).toMatch(/written separately/)
  })

  it('includes the day-1 subject, preview, and body for context', () => {
    expect(prompt).toContain(firstEmail.subject)
    expect(prompt).toContain(firstEmail.preview)
    expect(prompt).toContain(firstEmail.content)
  })

  it('produces a JSON shape ranging from day 2 to day N', () => {
    expect(prompt).toContain('"day": 2')
    expect(prompt).toContain(`"day": ${config.days}`)
  })

  it('explicitly asks for exactly days-1 emails (one per remaining day)', () => {
    expect(prompt).toMatch(new RegExp(`exactly\\s*${config.days - 1}\\s*emails`, 'i'))
  })

  it('forbids invented stats', () => {
    expect(prompt.toLowerCase()).toMatch(/do not invent/i)
  })

  it('preserves coherence guidance (escalate / match voice)', () => {
    expect(prompt.toLowerCase()).toMatch(
      /coherent|do not repeat its hook|voice should match|escalate/i,
    )
  })

  it('omits analysis block when analysis is undefined', () => {
    const p = buildRemainingEmailsInstructions(config, 'https://e.com', firstEmail, 'content')
    expect(p).not.toContain('LANDING PAGE ANALYSIS')
  })

  it('cuts landing content at 10k chars of visible text', () => {
    const sentinel = '☃'
    const longContent = sentinel.repeat(12000)
    const p = buildRemainingEmailsInstructions(config, 'https://e.com', firstEmail, longContent)
    const count = (p.match(/☃/g) || []).length
    expect(count).toBe(10000)
  })

  it('handles a 2-day campaign (only day 2 to write)', () => {
    const p = buildRemainingEmailsInstructions(
      { days: 2, campaignType: 'nurture', tone: 'friendly' },
      'https://e.com',
      firstEmail,
    )
    expect(p).toMatch(/Days?\s*2\s*(through|to|–|-)\s*2/i)
    expect(p).toMatch(/exactly\s*1\s*emails?/i)
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

describe('writing rules', () => {
  const config = { days: 5, campaignType: 'nurture', tone: 'friendly' }
  const builders = [
    () => buildInstructions(config, 'https://e.com'),
    () => buildFirstEmailInstructions(config, 'https://e.com'),
    () =>
      buildRemainingEmailsInstructions(config, 'https://e.com', {
        subject: 's',
        preview: 'p',
        content: 'c',
      }),
  ]

  it.each(builders.map((b, i) => [i, b]))('builder %i carries the craft rules', (_i, build) => {
    const p = (build as () => string)()
    expect(p).toContain('How to write each email:')
    expect(p).toContain('Never mention day numbers')
    expect(p).toContain('Markdown link to https://e.com')
  })
})

describe('language rule', () => {
  it('asks for the page language everywhere, sign-off included', () => {
    const p = buildFirstEmailInstructions(
      { days: 5, campaignType: 'nurture', tone: 'friendly' },
      'https://e.cz',
    )
    expect(p).toContain('Write every word in the language of the landing page')
    expect(p).toContain('Tým Fakturoid')
  })
})

describe('prompt lookups ignore built-in object keys', () => {
  it.each(['constructor', 'toString', 'valueOf', 'hasOwnProperty'])(
    'treats %s like an unknown type and tone',
    (key) => {
      expect(getCampaignStructure(key, 7)).toBe(getCampaignStructure('nurture', 7))
      expect(getToneGuidelines(key)).toBe(getToneGuidelines('friendly'))
    },
  )
})
