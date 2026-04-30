import { z } from 'zod'
import { emailEditSchema } from '@/lib/schemas'

interface OpenAIResponse {
  output_text?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
}

const parsedChatSchema = z.object({
  message: z.string(),
  shouldEdit: z.boolean().optional(),
  edits: emailEditSchema.optional(),
})

export interface ChatResponse {
  message: string
  shouldEdit: boolean
  edits?: {
    subject?: string
    content?: string
  }
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
}

export function parseOpenAIResponse(response: OpenAIResponse): ChatResponse {
  if (!response.output_text) {
    throw new Error('No response from OpenAI')
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('OpenAI Response:', response.output_text)
  }

  // Two failure modes to handle: (1) the model returned non-JSON prose, and
  // (2) the model returned JSON but with the wrong shape (extra/missing keys,
  // wrong types). For both we fall back to treating output_text as the
  // assistant message and dropping `edits` so we can never apply a
  // model-controlled object straight into the user's email state.
  let raw: unknown
  try {
    raw = JSON.parse(response.output_text)
  } catch {
    return {
      message: response.output_text,
      shouldEdit: false,
      usage: response.usage,
    }
  }

  const parsed = parsedChatSchema.safeParse(raw)
  if (!parsed.success) {
    console.error('Chat response shape mismatch:', parsed.error.flatten())
    return {
      message: response.output_text,
      shouldEdit: false,
      usage: response.usage,
    }
  }

  const shouldEdit = parsed.data.shouldEdit ?? false
  return {
    message: parsed.data.message,
    shouldEdit,
    edits: shouldEdit ? parsed.data.edits : undefined,
    usage: response.usage,
  }
}
