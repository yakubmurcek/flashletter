/**
 * OpenAI API retry logic with exponential backoff
 * Handles rate limiting (429) and server errors (500+)
 * Based on OpenAI best practices documentation
 */

interface RetryConfig {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 60000, // 60 seconds
  backoffMultiplier: 2,
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay)

  // Add jitter to prevent thundering herd problem
  const jitter = Math.random() * 0.1 * cappedDelay

  return cappedDelay + jitter
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  // Check for rate limit errors (429)
  if ('status' in error && error.status === 429) return true

  // Check for server errors (500+)
  if ('status' in error) {
    const status = error.status as number
    return status >= 500 && status < 600
  }

  // Check for network errors
  if (
    'code' in error &&
    typeof error.code === 'string' &&
    (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')
  ) {
    return true
  }

  return false
}

/**
 * Retry wrapper for OpenAI API calls with exponential backoff
 *
 * @param fn The async function to retry
 * @param config Retry configuration
 * @returns The result of the function call
 *
 * @example
 * const response = await retryWithBackoff(() =>
 *   openai.responses.create({
 *     model: 'gpt-5',
 *     input: 'Hello!',
 *   })
 * )
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  let lastError: unknown

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if it's the last attempt
      if (attempt === finalConfig.maxRetries) {
        break
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error
      }

      // Log the retry attempt
      console.warn(
        `API call failed (attempt ${attempt + 1}/${finalConfig.maxRetries + 1}). Retrying...`,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          status:
            error && typeof error === 'object' && 'status' in error ? error.status : undefined,
        },
      )

      // Calculate and wait for the backoff delay
      const delay = calculateDelay(attempt, finalConfig)
      await sleep(delay)
    }
  }

  // All retries exhausted
  throw lastError
}

/**
 * Extract rate limit information from OpenAI error headers
 */
export function extractRateLimitInfo(error: unknown): {
  limit?: number
  remaining?: number
  resetTime?: number
} {
  if (!error || typeof error !== 'object' || !('headers' in error) || !error.headers) {
    return {}
  }

  const headers = error.headers as Record<string, string>

  return {
    limit: headers['x-ratelimit-limit-requests']
      ? parseInt(headers['x-ratelimit-limit-requests'], 10)
      : undefined,
    remaining: headers['x-ratelimit-remaining-requests']
      ? parseInt(headers['x-ratelimit-remaining-requests'], 10)
      : undefined,
    resetTime: headers['x-ratelimit-reset-requests']
      ? parseInt(headers['x-ratelimit-reset-requests'], 10)
      : undefined,
  }
}
