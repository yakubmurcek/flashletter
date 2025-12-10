# Scraping System Documentation

## Overview

The newsletter generator includes a sophisticated web scraping system designed to extract content and metadata from landing pages. The system uses a multi-layered approach with intelligent fallbacks to ensure reliable content extraction.

## Architecture

### Core Components

1. **Static Scraper** (`lib/utils/scraper.ts`) - Cheerio-based HTML parsing
2. **Dynamic Scraper** (`lib/utils/playwright-scraper.ts`) - Playwright for JavaScript-heavy sites
3. **Metadata Extractor** (`lib/utils/metadata-extractor.ts`) - Comprehensive metadata extraction
4. **Cache Layer** (`lib/utils/scraper-cache.ts`) - Redis-based caching
5. **API Route** (`app/api/scrape-landing/route.ts`) - Main endpoint

### Data Flow

```
URL Request → Cache Check → Static Scraping → Dynamic Fallback → Cache Store → Response
```

## Features

### Smart Content Extraction

- **Content Prioritization**: Prioritizes main content areas (articles, main sections) over navigation and ads
- **Noise Removal**: Automatically removes scripts, styles, navigation, footers, and advertisements
- **Smart Truncation**: Truncates at sentence boundaries up to 10,000 characters
- **Structure Preservation**: Maintains text hierarchy and proper spacing

### Comprehensive Metadata Extraction

- **Basic Meta Tags**: title, description, keywords, author
- **Open Graph**: og:title, og:description, og:image, og:type, og:url, og:site_name
- **Twitter Cards**: twitter:card, twitter:title, twitter:description, twitter:image
- **Structured Data**: JSON-LD parsing and extraction
- **Technical**: favicon, canonical URL, publication dates

### Dynamic Content Support

- **Automatic Detection**: Detects JavaScript-heavy sites (React, Vue, Angular, etc.)
- **Playwright Integration**: Uses Playwright with Chromium for dynamic rendering
- **Serverless Ready**: Optimized for Vercel/AWS Lambda deployment
- **Fallback Strategy**: Tries static first, falls back to dynamic when needed
- **Development Mode**: Playwright is disabled in development to avoid browser launch issues
- **Graceful Degradation**: Falls back to static scraping if Playwright fails

### Intelligent Caching

- **Redis-Based**: Uses Upstash Redis for distributed caching
- **24-Hour TTL**: Configurable cache expiration
- **Cache-First Strategy**: Checks cache before scraping
- **Graceful Degradation**: Works without Redis if unavailable

## API Usage

### Endpoint

```
POST /api/scrape-landing
```

### Request Body

```typescript
{
  url: string,           // Required: URL to scrape
  useDynamic?: boolean   // Optional: Force dynamic scraping
}
```

### Response

```typescript
{
  content: string,       // Extracted text content
  metadata: {            // Comprehensive metadata
    title?: string,
    description?: string,
    ogTitle?: string,
    ogDescription?: string,
    ogImage?: string,
    keywords?: string[],
    favicon?: string,
    structuredData?: any[],
    // ... more fields
  },
  url: string,           // Final URL (after redirects)
  stats: {               // Scraping statistics
    wordCount: number,
    extractionMethod: 'static' | 'dynamic',
    cached: boolean,
    loadTime?: number,
    finalUrl?: string
  }
}
```

### Headers

- `X-Cache-Status`: HIT or MISS
- `X-Cache-TTL`: Remaining cache time in seconds
- `X-Processing-Time`: Total processing time in milliseconds
- `X-Extraction-Method`: static or dynamic

## Configuration

### Environment Variables

```bash
# Redis Configuration (for caching)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Enable Playwright in development mode (for testing)
ENABLE_PLAYWRIGHT_DEV=true

# Optional: Custom User Agent
SCRAPER_USER_AGENT=Mozilla/5.0 (compatible; NewsletterGenerator/1.0)
```

**Note**: Playwright is disabled by default in development mode to avoid browser launch issues. To test dynamic scraping locally, add `ENABLE_PLAYWRIGHT_DEV=true` to your `.env.local` file.

### Constants

```typescript
// lib/constants/app.ts
LANDING_PAGE_CONTENT_LIMIT = 10000 // Max content length
SCRAPE_CACHE_TTL = 86400 // Cache TTL (24 hours)
PLAYWRIGHT_TIMEOUT = 10000 // Dynamic scraping timeout
MIN_CONTENT_LENGTH = 50 // Min words for meaningful content
```

## When Dynamic Scraping is Used

### Automatic Detection

The system automatically uses Playwright when it detects:

1. **JavaScript Frameworks**: React, Vue, Angular, Next.js, Nuxt.js
2. **SPA Indicators**: Empty main content areas, loading indicators
3. **Minimal Content**: Pages with less than 1,000 characters
4. **Known SPA Domains**: reactjs.org, vuejs.org, angular.io, etc.

### Manual Override

You can force dynamic scraping by setting `useDynamic: true` in the request.

## Performance Considerations

### Static Scraping (95% of sites)

- **Speed**: ~100-500ms
- **Resource Usage**: Low (just HTTP fetch + parsing)
- **Reliability**: High for traditional websites

### Dynamic Scraping (5% of sites)

- **Speed**: ~2-10 seconds
- **Resource Usage**: High (browser instance)
- **Reliability**: High for JavaScript-heavy sites

### Caching Benefits

- **Cache Hit**: ~10-50ms response time
- **Reduced Load**: Prevents redundant scraping
- **Cost Savings**: Reduces external requests

## Rate Limiting

- **Limit**: 20 requests per hour per user/IP
- **Implementation**: Uses Upstash Redis with sliding window
- **Headers**: Includes rate limit information in responses
- **Fallback**: Works without Redis (no rate limiting)

## Error Handling

### Common Errors

1. **Invalid URL**: Returns 400 with validation details
2. **Fetch Failed**: Returns 400 with specific error message
3. **Dynamic Scraping Failed**: Returns 500 with error details
4. **Rate Limit Exceeded**: Returns 429 with retry information

### Graceful Degradation

- **Redis Unavailable**: Continues without caching
- **Playwright Fails**: Falls back to static scraping
- **Malformed HTML**: Handles gracefully with partial extraction

## Monitoring and Debugging

### Cache Statistics

```typescript
// Get cache statistics
const stats = await getCacheStats()
// Returns: { totalKeys, scrapeKeys, memoryUsage }
```

### Browser Information

```typescript
// Get Playwright browser info
const info = await getBrowserInfo()
// Returns: { userAgent, viewport, chromiumVersion }
```

### Logging

The system logs:

- Cache hits/misses
- Dynamic scraping decisions
- Error details with context
- Performance metrics

## Testing

### Test Suite

Run the comprehensive test suite:

```bash
pnpm test test/scraper.test.ts
```

### Test Coverage

- Content extraction with various HTML structures
- Metadata extraction for all supported formats
- Dynamic scraping detection logic
- Cache operations and error handling
- Edge cases and malformed input

## Troubleshooting

### Common Issues

1. **Empty Content**: Check if site requires JavaScript
   - Solution: Use `useDynamic: true` or check site structure

2. **Cache Not Working**: Verify Redis configuration
   - Check environment variables
   - Test Redis connection

3. **Dynamic Scraping Timeout**: Increase timeout or check site performance
   - Adjust `PLAYWRIGHT_TIMEOUT` constant
   - Check site loading speed

4. **Rate Limit Issues**: Check rate limiting configuration
   - Verify Redis is working
   - Check rate limit headers in responses

5. **Playwright Launch Errors**:
   - **In Development**: Set `ENABLE_PLAYWRIGHT_DEV=true` in `.env.local` to enable testing
   - **Browser Issues**: Ensure you have Chromium installed or let Playwright use system browser
   - **System Errors**: Fallback to static scraping is automatic if Playwright fails
   - **For Production**: Ensure proper Chromium installation with `@sparticuz/chromium`

### Debug Mode

Enable detailed logging by setting:

```bash
DEBUG=scraper:*
```

## Best Practices

### For Developers

1. **Always check cache first** before implementing new scraping logic
2. **Use static scraping** unless dynamic is absolutely necessary
3. **Handle errors gracefully** with appropriate fallbacks
4. **Monitor performance** and adjust timeouts as needed
5. **Test with real sites** to ensure reliability

### For Users

1. **Provide valid URLs** with proper protocols
2. **Be patient** with dynamic scraping (can take 5-10 seconds)
3. **Check rate limits** if getting 429 errors
4. **Use caching** to avoid redundant requests

## Future Enhancements

### Planned Features

1. **Content Classification**: Automatically categorize content types
2. **Image Extraction**: Extract and process images from pages
3. **Language Detection**: Detect and handle multiple languages
4. **Content Summarization**: AI-powered content summarization
5. **Real-time Monitoring**: Dashboard for scraping performance

### Performance Optimizations

1. **Parallel Processing**: Scrape multiple URLs simultaneously
2. **Smart Caching**: Cache based on content similarity
3. **CDN Integration**: Cache static assets
4. **Edge Computing**: Deploy scrapers closer to users

## Security Considerations

### Input Validation

- All URLs are validated using Zod schemas
- Content is sanitized before processing
- No arbitrary code execution

### Rate Limiting

- Prevents abuse and DoS attacks
- Per-user/IP limits with Redis tracking
- Graceful degradation when Redis unavailable

### Privacy

- No personal data is stored in cache
- User agents identify the scraper
- Respects robots.txt (future enhancement)

## Support

For issues or questions:

1. Check this documentation first
2. Review error logs and headers
3. Test with simple static sites
4. Verify environment configuration
5. Check rate limiting status

The scraping system is designed to be robust, performant, and production-ready while maintaining simplicity and reliability.
