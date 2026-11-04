import { z } from 'zod'
import { emailEditSchema } from '@/lib/schemas'
import { fixEmailLinks } from '@/lib/utils/email-links'

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

/**
 * @param landingUrl The campaign's landing URL: relative links in an edit are
 *   resolved against it (unsafe ones point at it), so a rewrite can't put a
 *   dead `/register` link into the email.
 */
export function toChatResponse(output: ChatOutput, landingUrl?: string): ChatResponse {
  // Edits are only applied when the model explicitly opted in, so a stray
  // `edits` object can never overwrite the user's email.
  const shouldEdit = output.shouldEdit && !!output.edits
  if (!shouldEdit || !output.edits) {
    return { message: output.message, shouldEdit: false, edits: undefined }
  }

  const edits = { ...output.edits }
  if (edits.content !== undefined) {
    edits.content = fixEmailLinks(edits.content, landingUrl)
  }
  return { message: output.message, shouldEdit, edits }
}
