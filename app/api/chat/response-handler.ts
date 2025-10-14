interface OpenAIResponse {
  output_text?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
}

interface ParsedChatResponse {
  shouldEdit: boolean
  message: string
  edits?: {
    subject?: string
    content?: string
  }
}

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

  // Log response for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('OpenAI Response:', response.output_text)
  }

  let parsedResponse: ParsedChatResponse

  try {
    parsedResponse = JSON.parse(response.output_text)
  } catch (parseError) {
    console.error('JSON Parse Error:', parseError)
    console.error('Raw response:', response.output_text)

    // If parsing fails, wrap the response as a message
    parsedResponse = {
      shouldEdit: false,
      message: response.output_text,
    }
  }

  return {
    message: parsedResponse.message,
    shouldEdit: parsedResponse.shouldEdit || false,
    edits: parsedResponse.shouldEdit ? parsedResponse.edits : undefined,
    usage: response.usage,
  }
}
