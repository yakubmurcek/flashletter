import { openai } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'

const generateEmailsSchema = z.object({
  landingUrl: z.string().url(),
  landingContent: z.string().optional(),
  config: z.object({
    tone: z.string(),
    campaignType: z.string(),
    days: z.number().min(1).max(30),
  }),
  campaignId: z.string().uuid().optional(),
})

export type GenerateEmailsRequest = z.infer<typeof generateEmailsSchema>

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { landingUrl, landingContent, config, campaignId } =
      generateEmailsSchema.parse(body)

    const instructions = `You are an expert email marketing copywriter. Generate a ${
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

IMPORTANT: Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "emails": [
    {
      "day": 1,
      "subject": "...",
      "preview": "...",
      "content": "..."
    }
  ]
}

Make sure the content is engaging, actionable, and aligned with best email marketing practices.`

    const userInput = `Generate ${config.days} emails for this ${config.campaignType} campaign. Return only valid JSON.`

    const response = await openai.responses.create({
      model: 'gpt-4o',
      instructions,
      input: userInput,
      temperature: 0.8,
    })

    if (!response.output_text) {
      throw new Error('No response from OpenAI')
    }

    const parsedResponse = JSON.parse(response.output_text)
    const emails = parsedResponse.emails || parsedResponse
    const emailsArray = Array.isArray(emails) ? emails : Object.values(emails)

    // If campaignId is provided, save emails to database
    if (campaignId) {
      const supabase = await createClient()
      const campaignService = new CampaignStorageService(supabase)

      // Transform emails to match our Email type
      const emailsToSave = emailsArray.map((email: any, index: number) => ({
        id: email.day || index + 1,
        day: email.day || index + 1,
        subject: email.subject || '',
        preview: email.preview || '',
        content: email.content || '',
      }))

      await campaignService.saveEmails(campaignId, emailsToSave)
    }

    return NextResponse.json({
      emails: emailsArray,
      usage: response.usage,
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
