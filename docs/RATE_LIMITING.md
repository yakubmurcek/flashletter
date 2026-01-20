# Rate Limiting Setup

This document describes the rate limiting implementation for the application,
following best practices from Supabase and OpenAI documentation.

## Overview

The application implements two types of rate limiting:

1. **User-based rate limiting** - Prevents abuse of API endpoints
2. **OpenAI retry logic** - Handles OpenAI API rate limits gracefully

## Features

### User-Based Rate Limiting

- Uses Upstash Redis for distributed rate limiting
- Sliding window algorithm for accurate rate limiting
- Rate limits are applied per user (authenticated) or per IP (anonymous)
- Returns standard rate limit headers in responses

### OpenAI Retry Logic

- Exponential backoff with jitter
- Handles 429 (rate limit) and 5xx (server error) responses
- Configurable retry attempts and delays
- Prevents thundering herd problem

## Rate Limits

| Endpoint               | Limit                | Window |
| ---------------------- | -------------------- | ------ |
| `/api/chat`            | 10 requests per user | 1 min  |
| `/api/generate-emails` | 5 requests per user  | 1 hour |
| `/api/scrape-landing`  | 20 requests per user | 1 hour |

## Setup

### 1. Install Dependencies

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

### 2. Configure Environment Variables

Add these to your `.env.local`:

```env
# Upstash Redis Configuration (Optional)
# If not set, rate limiting will be disabled (development mode)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

### 3. Get Upstash Redis Credentials

1. Sign up at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the REST URL and Token from the database details
4. Add them to your environment variables

## Development Mode

If Upstash Redis credentials are not provided, the application will:

- Disable rate limiting (allow all requests)
- Log a warning in the console
- Continue to work normally

This is useful for local development and testing.

## Production Mode

For production deployment:

1. **Required**: Set up Upstash Redis and configure environment variables
2. **Recommended**: Monitor rate limit usage via Upstash dashboard
3. **Optional**: Adjust rate limits based on your usage patterns

## Rate Limit Headers

All API responses include these headers when rate limiting is enabled:

- `X-RateLimit-Limit` - Maximum number of requests allowed
- `X-RateLimit-Remaining` - Number of requests remaining
- `X-RateLimit-Reset` - Unix timestamp when the limit resets

## Error Responses

### User Rate Limit Exceeded

```json
{
  "error": "Too many requests",
  "message": "Please wait before making another request."
}
```

Status: `429 Too Many Requests`

### OpenAI Rate Limit Exceeded

```json
{
  "error": "OpenAI rate limit exceeded",
  "message": "Too many requests to AI service. Please try again later.",
  "rateLimitInfo": {
    "limit": 10000,
    "remaining": 0,
    "resetTime": 1234567890
  }
}
```

Status: `429 Too Many Requests`

## Architecture

### Files

- `lib/utils/rate-limit.ts` - User-based rate limiting logic
- `lib/utils/openai-retry.ts` - OpenAI retry logic with exponential backoff
- `app/api/*/route.ts` - API routes with rate limiting applied

### Flow

1. Request arrives at API endpoint
2. User ID or IP address is extracted
3. Rate limit is checked against Redis
4. If limit exceeded, return 429 error
5. If limit OK, process request
6. For OpenAI calls, wrap with retry logic
7. Return response with rate limit headers

## Customization

### Adjusting Rate Limits

Edit `lib/utils/rate-limit.ts`:

```typescript
export const chatRateLimit = rateLimitEnabled
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 per minute
      analytics: true,
      prefix: 'ratelimit:chat',
    })
  : null
```

### Adjusting Retry Config

Edit retry calls in API routes:

```typescript
const response = await retryWithBackoff(
  () =>
    openai.responses.create({
      /* ... */
    }),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
  },
)
```

## Testing

### Test Rate Limiting

```bash
# Make multiple rapid requests to test rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "test"}]}'
  echo ""
done
```

### Test OpenAI Retry

Retry logic is automatically triggered when OpenAI returns 429 or 5xx errors.
Check console logs for retry attempts.

## Monitoring

### Upstash Dashboard

- View request counts per endpoint
- Monitor rate limit usage
- Analyze traffic patterns

### Application Logs

Look for these log messages:

- `API call failed (attempt X/Y). Retrying...` - Retry in progress
- Rate limit headers in response - Current usage status

## Best Practices

1. **Use authentication** - Rate limiting works best with authenticated users
2. **Monitor usage** - Keep an eye on rate limit usage in Upstash dashboard
3. **Adjust limits** - Tune rate limits based on actual usage patterns
4. **Handle errors** - Show user-friendly messages when rate limits are hit
5. **Cache responses** - Reduce API calls by caching when appropriate

## References

- [Supabase Rate Limiting Docs](https://supabase.com/docs/guides/auth/rate-limits)
- [OpenAI Production Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/features/ratelimiting)
