import { openai } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const generateEmailsSchema = z.object({
  landingUrl: z.string().url(),
  landingContent: z.string().optional(),
  config: z.object({
    tone: z.string(),
    campaignType: z.string(),
    days: z.number().min(1).max(30),
  }),
})

export type GenerateEmailsRequest = z.infer<typeof generateEmailsSchema>

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { landingUrl, landingContent, config } =
      generateEmailsSchema.parse(body)

    const systemPrompt = `You are an expert email marketing copywriter. Generate a ${
      config.days
    }-day ${config.campaignType} email campaign with a ${config.tone} tone.

Landing Page URL: ${landingUrl}
${
  landingContent
    ? `Landing Page Content:\n${landingContent.substring(0, 2000)}`
    : ''
}

For each email, provide:
1. A compelling subject line (under 60 characters)
2. Preview text (under 100 characters)
3. Email body content in Markdown format

Email campaign structure for ${config.campaignType}:
${getCampaignStructure(config.campaignType, config.days)}

Tone guidelines for ${config.tone}:
${getToneGuidelines(config.tone)}

Return the response as a JSON array of emails with this structure:
[
  {
    "day": 1,
    "subject": "...",
    "preview": "...",
    "content": "..."
  }
]

Make sure the content is engaging, actionable, and aligned with best email marketing practices.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate ${config.days} emails for this ${config.campaignType} campaign.`,
        },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    })

    const responseContent = completion.choices[0]?.message?.content

    if (!responseContent) {
      throw new Error('No response from OpenAI')
    }

    const parsedResponse = JSON.parse(responseContent)
    const emails = parsedResponse.emails || parsedResponse

    return NextResponse.json({
      emails: Array.isArray(emails) ? emails : Object.values(emails),
      usage: completion.usage,
    })
  } catch (error) {
    console.error('Generate Emails API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate emails' },
      { status: 500 }
    )
  }
}

function getCampaignStructure(type: string, days: number): string {
  const structures: Record<string, string> = {
    nurture: `
Day 1: Welcome & Introduction
Days 2-${Math.floor(days / 2)}: Value-building content, educational resources
Days ${Math.floor(days / 2) + 1}-${days - 1}: Social proof, success stories
Day ${days}: Strong call-to-action`,

    onboarding: `
Day 1: Warm welcome, set expectations
Days 2-${Math.floor(days / 3)}: Getting started guide, basic features
Days ${Math.floor(days / 3) + 1}-${Math.floor(
      (2 * days) / 3
    )}: Advanced features, pro tips
Days ${
      Math.floor((2 * days) / 3) + 1
    }-${days}: Completion celebration, next steps`,

    promotional: `
Day 1: Introduce offer, create awareness
Days 2-${Math.floor(days / 2)}: Build urgency, showcase benefits
Days ${Math.floor(days / 2) + 1}-${days - 1}: Overcome objections, testimonials
Day ${days}: Final push, last chance messaging`,
  }

  return structures[type] || structures.nurture
}

function getToneGuidelines(tone: string): string {
  const tones: Record<string, string> = {
    professional:
      'Formal language, clear and direct, industry expertise, authoritative',
    friendly:
      'Conversational, warm, approachable, use "you" and "we", casual but respectful',
    enthusiastic:
      'Energetic, exciting, use exclamation points (moderately), positive language',
    casual: 'Relaxed, informal, conversational, relatable, down-to-earth',
  }

  return tones[tone] || tones.friendly
}
