import { describe, it, expect } from 'vitest'
import { aiEmailOutputSchema, aiEmailsResponseSchema, emailSchema } from '@/lib/schemas'

describe('aiEmailOutputSchema', () => {
  it('accepts the shape the AI prompts actually request (no id/uuid)', () => {
    const parsed = aiEmailOutputSchema.parse({
      day: 1,
      subject: 'Welcome',
      preview: "You're in",
      content: 'Body',
    })
    expect(parsed.day).toBe(1)
    expect(parsed.subject).toBe('Welcome')
  })

  it('does not require id (id is a server/db concern, not an AI output)', () => {
    // emailSchema requires id; aiEmailOutputSchema does not. This is the whole
    // point of the split — AI prompts show 4 fields, structured-output schema
    // matches.
    expect(() =>
      emailSchema.parse({
        day: 1,
        subject: 's',
        preview: 'p',
        content: 'c',
      }),
    ).toThrow()
    expect(() =>
      aiEmailOutputSchema.parse({
        day: 1,
        subject: 's',
        preview: 'p',
        content: 'c',
      }),
    ).not.toThrow()
  })

  it('defaults preview to empty string when missing', () => {
    const parsed = aiEmailOutputSchema.parse({
      day: 1,
      subject: 's',
      content: 'c',
    })
    expect(parsed.preview).toBe('')
  })

  it('rejects day < 1', () => {
    expect(() =>
      aiEmailOutputSchema.parse({ day: 0, subject: 's', preview: 'p', content: 'c' }),
    ).toThrow()
  })

  it('rejects non-integer day', () => {
    expect(() =>
      aiEmailOutputSchema.parse({ day: 1.5, subject: 's', preview: 'p', content: 'c' }),
    ).toThrow()
  })
})

describe('aiEmailsResponseSchema', () => {
  it('requires at least one email', () => {
    expect(() => aiEmailsResponseSchema.parse({ emails: [] })).toThrow()
  })

  it('accepts a populated emails array', () => {
    const parsed = aiEmailsResponseSchema.parse({
      emails: [
        { day: 1, subject: 'a', preview: 'b', content: 'c' },
        { day: 2, subject: 'd', preview: 'e', content: 'f' },
      ],
    })
    expect(parsed.emails).toHaveLength(2)
  })
})
