# Utilities

This directory contains utility functions and helpers used throughout the application.

## Rate Limiting

### `rate-limit.ts`

Provides user-based rate limiting for API endpoints using Upstash Redis.

**Usage:**

```typescript
import { checkRateLimit, chatRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'

// In your API route
const identifier = user?.id || req.ip || 'anonymous'
const result = await checkRateLimit(chatRateLimit, identifier)

if (!result.success) {
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: getRateLimitHeaders(result.limit, result.remaining, result.reset),
    },
  )
}
```

**Available Rate Limiters:**

- `chatRateLimit` - 10 requests per minute
- `generateEmailsRateLimit` - 5 requests per hour
- `scrapeLandingRateLimit` - 20 requests per hour

### `openai-retry.ts`

Provides retry logic with exponential backoff for OpenAI API calls.

**Usage:**

```typescript
import { retryWithBackoff } from '@/lib/utils/openai-retry'

// Wrap OpenAI calls
const response = await retryWithBackoff(() =>
  openai.responses.create({
    model: 'gpt-4o',
    input: 'Hello!',
  }),
)
```

**Features:**

- Automatic retry on 429 (rate limit) and 5xx (server) errors
- Exponential backoff with jitter
- Configurable retry attempts and delays
- Rate limit info extraction

## Other Utilities

- `debounce.ts` - Debounce function calls
- `diff.ts` - Diff utilities for text comparison
- `email-helpers.ts` - Email-related helper functions
- `error-handling.ts` - Error handling utilities
- `markdown.ts` - Markdown processing utilities
- `storage.ts` - Storage utilities
- `validation.ts` - Validation helpers
- `version-storage.ts` - Version control utilities

## Environment Setup

For rate limiting to work, configure these environment variables:

```env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

If not set, rate limiting will be disabled (useful for development).
