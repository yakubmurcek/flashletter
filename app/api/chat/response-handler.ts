import { z } from 'zod'
import { emailEditSchema } from '@/lib/schemas'

// Shape Claude must return for every chat turn (enforced by structured outputs).
export const chatOutputSchema = z.object({
  message: z.string(),
  shouldEdit: z.boolean(),
  edits: emailEditSchema.optional(),
})

export type ChatOutput = z.infer<typeof chatOutputSchema>

export interface ChatResponse {
  message: string
  shouldEdit: boolean
  edits?: {
    subject?: string
    content?: string
  }
}

export function toChatResponse(output: ChatOutput): ChatResponse {
  // Edits are only applied when the model explicitly opted in, so a stray
  // `edits` object can never overwrite the user's email.
  const shouldEdit = output.shouldEdit && !!output.edits
  return {
    message: output.message,
    shouldEdit,
    edits: shouldEdit ? output.edits : undefined,
  }
}
