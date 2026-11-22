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

Per-IP limiters, checked after the per-user one with `checkUserAndIpRateLimit`
(a guest gets a new user id per anonymous session, so the user limit alone
can be reset; the IP comes from Vercel's `x-real-ip`, never `cf-connecting-ip`):

- `chatIpRateLimit` - 60 requests per 10 minutes
- `scrapeLandingIpRateLimit` - 20 requests per 10 minutes (both scrape routes)
- `generateEmailsIpRateLimit` - 10 requests per hour (both generate routes)

### Claude calls

Retries live in the Anthropic SDK (`maxRetries: 3`, backoff on 429/5xx). Every AI call goes
through `generateStructured()` in `lib/ai.ts`; see that file.

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
