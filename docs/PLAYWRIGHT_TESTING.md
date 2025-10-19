# Testing Playwright in Development

## Overview

By default, Playwright is disabled in development mode to avoid browser launch issues. This guide explains how to enable it for testing dynamic scraping functionality.

## Quick Start

### 1. Enable Playwright in Development

Add this to your `.env.local` file:

```bash
ENABLE_PLAYWRIGHT_DEV=true
```

### 2. Install Playwright Browsers (Optional)

If you encounter browser launch issues, install Playwright's browsers:

```bash
pnpm exec playwright install chromium
```

Or use your system's Chromium:

```bash
# The scraper will automatically fallback to system browser if needed
```

### 3. Test the Scraper

Try scraping a JavaScript-heavy site:

```bash
curl -X POST http://localhost:3000/api/scrape-landing \
  -H "Content-Type: application/json" \
  -d '{"url": "https://reactjs.org", "useDynamic": true}'
```

## Common Issues

### Issue: "Playwright is disabled in development mode"

**Solution**: Add `ENABLE_PLAYWRIGHT_DEV=true` to your `.env.local` file and restart your dev server.

### Issue: "spawn Unknown system error -8"

**Solutions**:

1. Install Playwright browsers: `pnpm exec playwright install chromium`
2. Let it use system browser (automatic fallback)
3. The scraper will fallback to static scraping if Playwright fails

### Issue: Browser launch is slow

This is normal for the first launch. Subsequent launches are faster due to caching.

## Development vs Production

### Development Mode

- Playwright is **disabled by default** (opt-in)
- Set `ENABLE_PLAYWRIGHT_DEV=true` to enable
- Uses local browser installations
- Falls back to static scraping on errors

### Production Mode

- Playwright is **enabled by default** (opt-out)
- Uses `@sparticuz/chromium` for serverless
- Optimized for Vercel/AWS Lambda
- Graceful fallback to static scraping

## Testing Strategy

### For Most Development

Use **static scraping** (Playwright disabled):

- Faster
- No browser dependencies
- Works for 95% of sites

### For Dynamic Content Testing

Enable **Playwright** (when needed):

- Test JavaScript-heavy sites
- Verify fallback mechanisms
- Test production behavior

## Environment Variables

```bash
# .env.local

# Enable Playwright in development (default: false)
ENABLE_PLAYWRIGHT_DEV=true

# Redis for caching (optional but recommended)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## Verifying Setup

### Check if Playwright is Available

```bash
# Test with a simple SPA
curl -X POST http://localhost:3000/api/scrape-landing \
  -H "Content-Type: application/json" \
  -d '{"url": "https://reactjs.org"}'
```

Check the logs:

- ✅ "Switching to dynamic scraping" - Playwright detected SPA
- ✅ "Dynamic scraping failed, falling back to static" - Fallback working
- ✅ Content extracted successfully - Static scraping working

## Best Practices

1. **Keep it disabled by default**: Only enable when testing dynamic scraping
2. **Use static scraping for most tests**: It's faster and more reliable
3. **Test fallback behavior**: Ensure static scraping works as backup
4. **Check logs**: Monitor which extraction method is used

## Troubleshooting

### Reset Playwright

```bash
# Remove cached browsers
rm -rf ~/Library/Caches/ms-playwright

# Reinstall
pnpm exec playwright install chromium
```

### Check Installation

```bash
pnpm exec playwright --version
```

### Test Manually

```bash
# Install Playwright CLI
pnpm add -D @playwright/test

# Test browser launch
pnpm exec playwright test --headed
```

## Need Help?

1. Check the main [SCRAPING.md](./SCRAPING.md) documentation
2. Review error logs in the terminal
3. Try with static scraping first
4. Ensure `.env.local` has `ENABLE_PLAYWRIGHT_DEV=true`

## Summary

- ✅ Playwright is opt-in for development (set `ENABLE_PLAYWRIGHT_DEV=true`)
- ✅ Automatic fallback to static scraping if Playwright fails
- ✅ Production-ready with serverless Chromium
- ✅ Comprehensive error handling and logging

