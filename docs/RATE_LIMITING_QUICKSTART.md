# Rate Limiting Quick Start Guide

## 🚀 Quick Setup (Production)

### 1. Get Upstash Redis Credentials (Free)

1. Go to [upstash.com](https://upstash.com) and sign up
2. Click "Create Database"
3. Choose a name (e.g., "flashletter-rate-limit")
4. Select a region close to your deployment
5. Click "Create"
6. Copy the **REST URL** and **REST Token**

### 2. Add to Environment Variables

```env
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=AaXXAAXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 3. Deploy

That's it! Rate limiting is now active.

## 🧪 Local Development

Rate limiting is **automatically disabled** if Redis is not configured.

This means:

- No setup needed for local development
- All requests allowed
- No rate limit errors

To test rate limiting locally:

1. Add Upstash credentials to `.env.local`
2. Restart your dev server
3. Make rapid requests to see rate limiting in action

## 📊 Current Rate Limits

| Endpoint               | Limit       | Window |
| ---------------------- | ----------- | ------ |
| `/api/chat`            | 10 requests | 1 min  |
| `/api/generate-emails` | 5 requests  | 1 hour |
| `/api/scrape-landing`  | 20 requests | 1 hour |

## 🔍 Monitoring

### Check Rate Limit Status

All API responses include headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1697123456
```

### View Usage in Upstash Dashboard

1. Log in to [Upstash Console](https://console.upstash.com)
2. Select your database
3. View metrics and analytics

## ⚠️ Handling Rate Limit Errors

### User Rate Limit (429)

```json
{
  "error": "Too many requests",
  "message": "Please wait before making another request."
}
```

**Solution**: Wait for the time shown in `X-RateLimit-Reset` header.

### OpenAI Rate Limit (429)

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

**Note**: OpenAI rate limits are **automatically retried** with exponential backoff.
If you see this error, all retries have been exhausted.

## 🛠️ Customizing Rate Limits

### Adjust Limits

Edit `lib/utils/rate-limit.ts`:

```typescript
export const chatRateLimit = rateLimitEnabled
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(20, '1 m'), // Change to 20/min
      analytics: true,
      prefix: 'ratelimit:chat',
    })
  : null
```

### Adjust Retry Behavior

When calling OpenAI APIs, pass custom config:

```typescript
const response = await retryWithBackoff(
  () =>
    openai.responses.create({
      /* ... */
    }),
  {
    maxRetries: 5, // Try 5 times instead of 3
    initialDelay: 2000, // Start with 2 seconds instead of 1
    maxDelay: 120000, // Max 2 minutes instead of 1
    backoffMultiplier: 3, // 3x instead of 2x
  }
)
```

## 📈 Free Tier Limits

### Upstash Redis (Free Tier)

- 10,000 requests per day
- 256 MB storage
- Global database
- Pay-as-you-go pricing beyond free tier

**Good for:**

- Development
- Small to medium traffic apps
- Testing

**Upgrade when:**

- > 10,000 requests/day
- Need guaranteed SLA
- Need priority support

## ❓ FAQ

### Q: Do I need Redis for development?

**A:** No, rate limiting is automatically disabled without Redis.

### Q: What happens if I exceed the Upstash free tier?

**A:** Upstash automatically switches to pay-as-you-go. Check their
pricing at [upstash.com/pricing](https://upstash.com/pricing).

### Q: Can I use a different Redis provider?

**A:** Yes! Any Redis with REST API support works. Just update the
configuration in `lib/utils/rate-limit.ts`.

### Q: How do I disable rate limiting in production?

**A:** Remove the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
environment variables. Not recommended for production!

### Q: Can I set different limits for different users?

**A:** Currently no, but this can be implemented. See
`IMPLEMENTATION_SUMMARY.md` for future enhancements.

## 🆘 Troubleshooting

### Rate limiting not working

1. Check environment variables are set correctly
2. Check Upstash dashboard for connection errors
3. Verify Redis URL is correct (should start with `https://`)
4. Check application logs for errors

### Too many 429 errors

1. Review your rate limits - might be too strict
2. Check if users are making unnecessary requests
3. Implement request batching in your frontend
4. Consider upgrading rate limits for paid users

### OpenAI retries failing

1. Check OpenAI API status: [status.openai.com](https://status.openai.com)
2. Verify your OpenAI API key is valid
3. Check you have sufficient credits
4. Review retry logs in console

## 📚 Additional Resources

- Full documentation: `RATE_LIMITING.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- Code examples: `lib/utils/README.md`

---

Need help? Create an issue in the repository!
