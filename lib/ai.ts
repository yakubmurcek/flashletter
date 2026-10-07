import Anthropic from '@anthropic-ai/sdk'
import { transformJSONSchema } from '@anthropic-ai/sdk/lib/transform-json-schema.mjs'
import type { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

/**
 * Single entry point for every Claude call in the app. Routes never build
 * requests themselves: they pass a prompt + a zod schema and get typed data back.
 */

export const CLAUDE_MODEL = 'claude-opus-5-5'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable')
  }
  // The SDK retries 408/409/429/5xx and connection errors with backoff itself.
  client ??= new Anthropic({ maxRetries: 3 })
  return client
}

type Effort = 'low' | 'medium' | 'high'

interface StructuredRequest<T extends z.ZodTypeAny> {
  system: string
  messages: Anthropic.Beta.BetaMessageParam[]
  schema: T
  /** low: extraction and chat. medium: copywriting (the model default). */
  effort?: Effort
  maxTokens?: number
}

const jsonSchemaCache = new WeakMap<z.ZodTypeAny, Record<string, unknown>>()

function toOutputSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  let cached = jsonSchemaCache.get(schema)
  if (!cached) {
    const raw = zodToJsonSchema(schema, { $refStrategy: 'none', target: 'jsonSchema7' })
    delete (raw as Record<string, unknown>).$schema
    // Moves constraints structured outputs can't enforce (minLength, minItems>1,
    // ...) into descriptions; the zod parse below still enforces them.
    cached = transformJSONSchema(raw)
    jsonSchemaCache.set(schema, cached)
  }
  return cached
}

/**
 * Calls Claude with structured outputs and validates the result against the
 * zod schema (so `.trim()`, `.default()` and `.min()` still apply).
 */
export async function generateStructured<T extends z.ZodTypeAny>({
  system,
  messages,
  schema,
  effort = 'medium',
  maxTokens = 32000,
}: StructuredRequest<T>): Promise<z.infer<T>> {
  // Streaming keeps long generations clear of HTTP timeouts.
  const response = await getClient()
    .beta.messages.stream({
      model: CLAUDE_MODEL,
      // If a safety classifier declines, the API retries on a suitable model
      // inside the same call instead of failing the user's generation.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      max_tokens: maxTokens,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
      output_config: {
        effort,
        format: { type: 'json_schema', schema: toOutputSchema(schema) },
      },
    })
    .finalMessage()

  if (response.stop_reason === 'refusal') {
    throw new Error('The AI declined to process this page')
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('AI response was cut off before it finished')
  }

  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
  if (!text) {
    throw new Error('No response from Claude')
  }

  // Model-output problems must not surface as the caller's request ZodError.
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('AI returned malformed JSON')
  }
  const result = schema.safeParse(json)
  if (!result.success) {
    throw new Error('AI returned an unexpected format')
  }
  return result.data
}

/**
 * Rate-limit details from a Claude 429, for Sentry context and the client.
 */
export function extractRateLimitInfo(error: unknown): {
  limit?: number
  remaining?: number
  resetTime?: string
} {
  if (!(error instanceof Anthropic.APIError) || !error.headers) return {}
  const get = (name: string) => error.headers?.get(name) ?? undefined
  const limit = get('anthropic-ratelimit-requests-limit')
  const remaining = get('anthropic-ratelimit-requests-remaining')
  return {
    limit: limit ? parseInt(limit, 10) : undefined,
    remaining: remaining ? parseInt(remaining, 10) : undefined,
    resetTime: get('anthropic-ratelimit-requests-reset'),
  }
}

export function isRateLimitError(error: unknown): boolean {
  return error instanceof Anthropic.RateLimitError
}
