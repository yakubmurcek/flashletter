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
- `redis-client.ts` - The one Upstash Redis client (rate limits, scrape cache, billing usage counters and Stripe caches)
- `storage.ts` - Storage utilities
- `validation.ts` - Validation helpers
- `version-storage.ts` - Version control utilities

## Environment Setup

`redis-client.ts` builds the Redis client from these environment variables (or the
`KV_REST_API_URL`/`KV_REST_API_TOKEN` pair the Vercel Marketplace integration injects):

```env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

If not set, rate limits fall back to in-memory counters per server instance, the scrape
cache is skipped, and billing loses its Redis parts: the monthly AI-rewrite cap is not enforced,
the monthly campaign count falls back to counting database rows, and the Stripe customer,
summary and last-plan caches are off (see `lib/billing/limits.ts`, `lib/billing/stripe.ts`).
