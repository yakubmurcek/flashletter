import { describe, it, expect } from 'vitest'
import {
  SMART_DEFAULT_CAMPAIGN_CONFIG,
  CAMPAIGN_TONES,
  CAMPAIGN_TYPES,
  CAMPAIGN_DURATION,
} from '@/lib/constants/campaign'
import { campaignConfigSchema } from '@/lib/schemas'

describe('SMART_DEFAULT_CAMPAIGN_CONFIG', () => {
  it('passes the campaignConfigSchema', () => {
    const parsed = campaignConfigSchema.parse({ ...SMART_DEFAULT_CAMPAIGN_CONFIG })
    expect(parsed).toEqual(SMART_DEFAULT_CAMPAIGN_CONFIG)
  })

  it('uses a tone that exists in the playbook', () => {
    const valid = CAMPAIGN_TONES.map((t) => t.value)
    expect(valid).toContain(SMART_DEFAULT_CAMPAIGN_CONFIG.tone)
  })

  it('uses a campaign type that exists in the playbook', () => {
    const valid = CAMPAIGN_TYPES.map((t) => t.value)
    expect(valid).toContain(SMART_DEFAULT_CAMPAIGN_CONFIG.campaignType)
  })

  it('days falls within the duration bounds', () => {
    expect(SMART_DEFAULT_CAMPAIGN_CONFIG.days).toBeGreaterThanOrEqual(CAMPAIGN_DURATION.MIN)
    expect(SMART_DEFAULT_CAMPAIGN_CONFIG.days).toBeLessThanOrEqual(CAMPAIGN_DURATION.MAX)
  })

  it('keeps a short demo length so the streamed sequence finishes quickly', () => {
    // Guards against accidentally bumping the default to a length that defeats
    // the "land in editor with first email fast" UX.
    expect(SMART_DEFAULT_CAMPAIGN_CONFIG.days).toBeLessThanOrEqual(5)
  })
})
