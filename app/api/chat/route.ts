import { openai } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requestSchema } from './schemas'
import { buildSystemInstructions } from './prompt-builder'
import { parseOpenAIResponse } from './response-handler'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, campaignContext, emailContext, selectedContext } =
      requestSchema.parse(body)

    const instructions = buildSystemInstructions(
      campaignContext,
      emailContext,
      selectedContext
    )

    const userInput = messages[messages.length - 1]?.content || ''

    const response = await openai.responses.create({
      model: 'gpt-4o',
      instructions,
      input: userInput,
      temperature: 0.7,
      max_output_tokens: 2000,
    })

    const parsedResponse = parseOpenAIResponse(response)

    return NextResponse.json(parsedResponse)
  } catch (error) {
    console.error('Chat API Error:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : error
    )

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
