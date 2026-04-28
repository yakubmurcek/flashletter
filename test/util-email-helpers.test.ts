import { describe, it, expect } from 'vitest'
import { getSubjectForDay, getPreviewForDay, getContentForDay } from '@/lib/utils/email-helpers'

describe('getSubjectForDay', () => {
  it('returns valid subject for nurture type', () => {
    const result = getSubjectForDay(1, 'nurture')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns different subject for each day', () => {
    const day1 = getSubjectForDay(1, 'nurture')
    const day2 = getSubjectForDay(2, 'nurture')
    expect(day1).not.toBe(day2)
  })

  it('wraps around for days beyond available subjects', () => {
    const day7 = getSubjectForDay(7, 'nurture')
    const day8 = getSubjectForDay(8, 'nurture')
    expect(day8).toBe(day7) // Should reuse the last one
  })

  it('supports onboarding type', () => {
    const result = getSubjectForDay(1, 'onboarding')
    expect(result).toBe('Welcome aboard!')
  })

  it('supports promotional type', () => {
    const result = getSubjectForDay(1, 'promotional')
    expect(result).toBe('Special offer inside')
  })

  it('supports educational type', () => {
    const result = getSubjectForDay(1, 'educational')
    expect(result).toBe('Lesson 1: Getting Started')
  })

  it('supports re-engagement type', () => {
    const result = getSubjectForDay(1, 're-engagement')
    expect(result).toBe('We miss you!')
  })

  it('falls back to nurture for unknown type', () => {
    const result = getSubjectForDay(1, 'unknown-type')
    expect(result).toBe(getSubjectForDay(1, 'nurture'))
  })

  it('handles day 1', () => {
    expect(getSubjectForDay(1, 'nurture')).toBe('Welcome to our community')
  })

  it('handles day 365', () => {
    const result = getSubjectForDay(365, 'nurture')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles negative day gracefully', () => {
    const result = getSubjectForDay(-1, 'nurture')
    expect(typeof result).toBe('string')
  })
})

describe('getPreviewForDay', () => {
  it('returns preview text for day', () => {
    const result = getPreviewForDay(1, 'nurture')
    expect(result).toContain('email')
    expect(result).toContain('nurture')
  })

  it('includes day number in preview', () => {
    const result = getPreviewForDay(5, 'promotional')
    expect(result).toContain('5')
  })

  it('includes campaign type in preview', () => {
    const result = getPreviewForDay(2, 'educational')
    expect(result).toContain('educational')
  })

  it('returns consistent format', () => {
    const preview = getPreviewForDay(1, 'onboarding')
    expect(preview).toMatch(/This is email \d+ of your .+ campaign/)
  })
})

describe('getContentForDay', () => {
  it('returns content with day number', () => {
    const result = getContentForDay(1, 'nurture', 'friendly')
    expect(result).toContain('Day 1')
  })

  it('includes campaign type in content', () => {
    const result = getContentForDay(2, 'promotional', 'professional')
    expect(result).toContain('promotional')
  })

  it('includes tone in content', () => {
    const result = getContentForDay(1, 'nurture', 'casual')
    expect(result).toContain('casual')
  })

  it('has markdown structure with headings', () => {
    const result = getContentForDay(1, 'nurture', 'professional')
    expect(result).toContain('# Welcome')
    expect(result).toContain('## What\'s Inside')
    expect(result).toContain('### Key Points')
  })

  it('includes call-to-action', () => {
    const result = getContentForDay(1, 'nurture', 'professional')
    expect(result).toContain('Next Steps')
  })

  it('has bullet points', () => {
    const result = getContentForDay(1, 'nurture', 'professional')
    expect(result).toContain('•')
  })

  it('returns different content for different days', () => {
    const content1 = getContentForDay(1, 'nurture', 'professional')
    const content2 = getContentForDay(2, 'nurture', 'professional')
    expect(content1).toContain('Day 1')
    expect(content2).toContain('Day 2')
  })

  it('returns different content for different tones', () => {
    const friendly = getContentForDay(1, 'nurture', 'friendly')
    const formal = getContentForDay(1, 'nurture', 'formal')
    expect(friendly).toContain('friendly')
    expect(formal).toContain('formal')
  })

  it('supports various campaign types', () => {
    const types = ['nurture', 'promotional', 'educational', 'onboarding', 're-engagement']
    types.forEach((type) => {
      const result = getContentForDay(1, type, 'professional')
      expect(result).toContain(type)
    })
  })

  it('has basic email structure', () => {
    const result = getContentForDay(1, 'nurture', 'professional')
    expect(result).toContain('Hi there')
    expect(result).toContain('Best regards')
  })
})
