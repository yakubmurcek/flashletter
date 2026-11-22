import { describe, it, expect } from 'vitest'
import { buildSystemInstructions } from '@/app/api/chat/prompt-builder'
import {
  CHAT_EMAIL_CONTENT_LIMIT,
  CHAT_MAX_LISTED_EMAILS,
  CHAT_METADATA_LIMIT,
  CHAT_SELECTION_LIMIT,
} from '@/app/api/chat/limits'
import type { CampaignContext } from '@/app/api/chat/schemas'

const HUGE = 'x'.repeat(1_000_000)

// The fixed prompt text (role, style, examples) with no context at all.
const BASE_LENGTH = buildSystemInstructions(undefined, undefined, undefined).length

function campaign(overrides: Partial<CampaignContext> = {}): CampaignContext {
  return {
    landingPageData: { url: 'https://example.com', content: 'Landing copy' },
    config: { tone: 'friendly', campaignType: 'welcome', days: 3 },
    allEmails: [{ id: 1, day: 1, subject: 'Hi', preview: 'Hello', content: 'Body' }],
    currentEmailId: 1,
    ...overrides,
  }
}

describe('buildSystemInstructions size bounds', () => {
  it('keeps a normal email in full', () => {
    const body = 'A normal email body. '.repeat(60)
    const prompt = buildSystemInstructions(
      campaign({
        allEmails: [{ id: 1, day: 1, subject: 'Hi', preview: 'Hello', content: body }],
      }),
      undefined,
      undefined,
    )
    expect(prompt).toContain(body)
  })

  it('truncates the current email content', () => {
    const prompt = buildSystemInstructions(
      campaign({ allEmails: [{ id: 1, day: 1, subject: 'Hi', preview: '', content: HUGE }] }),
      undefined,
      undefined,
    )
    expect(prompt.length).toBeLessThan(BASE_LENGTH + CHAT_EMAIL_CONTENT_LIMIT + 5_000)
  })

  it('truncates the legacy email context content and fields', () => {
    const prompt = buildSystemInstructions(
      undefined,
      { subject: HUGE, content: HUGE, campaignType: HUGE },
      undefined,
    )
    expect(prompt.length).toBeLessThan(BASE_LENGTH + CHAT_EMAIL_CONTENT_LIMIT + 5_000)
  })

  it('truncates the selected text and action', () => {
    const prompt = buildSystemInstructions(undefined, undefined, { text: HUGE, action: HUGE })
    expect(prompt.length).toBeLessThan(BASE_LENGTH + CHAT_SELECTION_LIMIT + 5_000)
  })

  it('truncates the landing page url, title and description', () => {
    const prompt = buildSystemInstructions(
      campaign({
        landingPageData: {
          url: HUGE,
          content: 'Landing copy',
          metadata: { title: HUGE, description: HUGE },
        },
      }),
      undefined,
      undefined,
    )
    expect(prompt.length).toBeLessThan(BASE_LENGTH + 3 * CHAT_METADATA_LIMIT + 5_000)
  })

  it('truncates each listed email subject and preview', () => {
    const prompt = buildSystemInstructions(
      campaign({
        allEmails: [
          { id: 1, day: 1, subject: 'Hi', preview: '', content: 'Body' },
          { id: 2, day: 2, subject: HUGE, preview: HUGE, content: HUGE },
        ],
      }),
      undefined,
      undefined,
    )
    expect(prompt.length).toBeLessThan(BASE_LENGTH + 2 * CHAT_METADATA_LIMIT + 5_000)
  })

  it('lists at most the longest sequence (30 emails), however many are sent', () => {
    // ~3000 tiny emails fit in a small request body, but each listed email adds
    // a fixed template block to the prompt. The list must be capped.
    const allEmails = Array.from({ length: 3000 }, (_, i) => ({
      id: i + 1,
      day: i + 1,
      subject: '',
      preview: '',
      content: '',
    }))
    const prompt = buildSystemInstructions(
      campaign({ allEmails, currentEmailId: 1 }),
      undefined,
      undefined,
    )
    expect(prompt.length).toBeLessThan(BASE_LENGTH + CHAT_MAX_LISTED_EMAILS * 400 + 5_000)
  })

  it('always lists the current email even when it falls past the cap', () => {
    const allEmails = Array.from({ length: 40 }, (_, i) => ({
      id: i + 1,
      day: i + 1,
      subject: `Subject ${i + 1}`,
      preview: '',
      content: `Body ${i + 1}`,
    }))
    const prompt = buildSystemInstructions(
      campaign({ allEmails, currentEmailId: 40 }),
      undefined,
      undefined,
    )
    expect(prompt).toContain('Email 40 ⬅️ CURRENT EMAIL')
    expect(prompt).toContain('Body 40')
  })

  it('stays bounded with every field at 1M chars at once', () => {
    const prompt = buildSystemInstructions(
      {
        landingPageData: {
          url: HUGE,
          content: HUGE,
          metadata: { title: HUGE, description: HUGE },
        },
        config: { tone: 'friendly', campaignType: 'welcome', days: 30 },
        allEmails: Array.from({ length: 30 }, (_, i) => ({
          id: i + 1,
          day: i + 1,
          subject: HUGE,
          preview: HUGE,
          content: HUGE,
        })),
        currentEmailId: 1,
      },
      { subject: HUGE, content: HUGE, campaignType: HUGE },
      { text: HUGE, action: HUGE },
    )
    // Was ~6M chars before the caps; now well under 100k on top of the base.
    expect(prompt.length).toBeLessThan(BASE_LENGTH + 100_000)
  })
})
