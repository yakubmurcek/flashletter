import { openai } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
})

const requestSchema = z.object({
  messages: z.array(messageSchema),
  emailContext: z
    .object({
      subject: z.string().optional(),
      content: z.string().optional(),
      campaignType: z.string().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, emailContext } = requestSchema.parse(body)

    const systemPrompt = `You are an expert email marketing assistant helping users create and optimize newsletter campaigns. ${
      emailContext
        ? `The current email context:\n- Subject: ${
            emailContext.subject
          }\n- Campaign Type: ${
            emailContext.campaignType
          }\n- Content: ${emailContext.content?.substring(0, 200)}...`
        : ''
    }
    
Your role is to:
- Provide actionable advice on email copywriting, subject lines, and CTAs
- Suggest improvements to increase engagement and conversion rates
- Help with tone, structure, and content optimization
- Answer questions about email marketing best practices
- Be concise, practical, and friendly

Keep responses helpful and to-the-point.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 500,
    })

    const assistantMessage = completion.choices[0]?.message?.content

    if (!assistantMessage) {
      throw new Error('No response from OpenAI')
    }

    return NextResponse.json({
      message: assistantMessage,
      usage: completion.usage,
    })
  } catch (error) {
    console.error('Chat API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
