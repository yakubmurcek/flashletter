<!-- 11941029-9c85-4b78-af44-bc16610a1099 2ada7c08-862e-4448-9b77-3bdda1d78d80 -->
# Production-Ready Scraping Improvements

## 1. Install Dependencies

Add required packages:

```bash
pnpm add cheerio playwright-core @sparticuz/chromium
pnpm add -D @types/cheerio
```

**Why Playwright?** Better than Puppeteer for: serverless support, reliability with modern frameworks, faster performance, better API with auto-waiting, active Microsoft maintenance, and smaller bundle size.

## 2. Create Scraping Utilities

**File**: `lib/utils/scraper.ts`

Implement intelligent HTML parsing with cheerio:

- Smart content extraction prioritizing main content (articles, main sections)
- Remove noise (nav, footer, ads, cookie banners)
- Extract text with proper spacing and hierarchy preservation
- Increase content limit to 10,000 characters with smart truncation at sentence boundaries

**File**: `lib/utils/scraper-cache.ts`

Implement Redis-based caching:

- Cache key format: `scrape:${hash(url)}`
- TTL: 24 hours (configurable)
- Fallback to no-cache if Redis unavailable
- Include cache status in response headers

**File**: `lib/utils/metadata-extractor.ts`

Extract comprehensive metadata:

- Basic: title, description, keywords
- Open Graph: og:title, og:description, og:image, og:type
- Twitter Cards: twitter:card, twitter:title, twitter:description
- JSON-LD structured data parsing
- Favicon extraction

**File**: `lib/utils/playwright-scraper.ts`

Add dynamic content support with Playwright:

- Use Playwright with Chromium for JS-heavy sites
- Fallback mechanism: Try static first, use Playwright on failure
- Timeout: 10 seconds max
- Deploy-friendly: Use `@sparticuz/chromium` for Vercel/AWS Lambda
- Auto-waiting for network idle and content loaded
- Only activate for explicit flag or when static scraping fails

## 3. Update API Route

**File**: `app/api/scrape-landing/route.ts`

Enhance the endpoint:

- Add optional `?useDynamic=true` query parameter for Playwright
- Implement cache-first strategy with Redis
- Use new cheerio-based scraper
- Enhanced error handling with specific error types
- Return additional metadata (word count, extraction method used)
- Add `X-Cache-Status` header (HIT/MISS)

## 4. Update Schemas

**File**: `lib/schemas/api.ts`

Extend response schema:

```typescript
scrapeLandingResponseSchema = z.object({
  content: z.string(),
  metadata: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    ogImage: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    favicon: z.string().optional(),
    structuredData: z.any().optional(),
  }),
  url: z.string(),
  stats: z.object({
    wordCount: z.number(),
    extractionMethod: z.enum(['static', 'dynamic']),
    cached: z.boolean(),
  }),
})
```

## 5. Update Constants

**File**: `lib/constants/app.ts`

Update limits:

```typescript
LANDING_PAGE_CONTENT_LIMIT = 10000
SCRAPE_CACHE_TTL = 60 * 60 * 24 // 24 hours
PLAYWRIGHT_TIMEOUT = 10000 // 10 seconds
```

## 6. Create Utility Functions

**File**: `lib/utils/redis-client.ts`

Create reusable Redis client:

- Export shared Redis instance
- Proper error handling
- Graceful fallback when Redis unavailable

## 7. Add Tests

**File**: `test/scraper.test.ts`

Comprehensive test suite:

- Test cheerio content extraction
- Test metadata extraction
- Test cache hit/miss scenarios
- Test Playwright fallback
- Mock external requests

## 8. Update Documentation

**File**: `docs/SCRAPING.md`

Document the scraping system:

- Architecture overview
- When Playwright is used vs static scraping
- Caching strategy
- Rate limiting considerations
- Performance metrics
- Troubleshooting guide

## Implementation Notes

- All changes maintain backward compatibility
- Graceful degradation: Falls back to simpler methods if advanced features fail
- Performance: Static scraping for 95% of sites, Playwright only when needed
- Cost-effective: Redis caching reduces redundant requests
- Production-ready: Comprehensive error handling and logging
- Playwright chosen over Puppeteer for better reliability and serverless support

### To-dos

- [ ] Install cheerio, puppeteer-core, @sparticuz/chromium packages
- [ ] Create shared Redis client utility (lib/utils/redis-client.ts)
- [ ] Build cheerio-based content extractor with smart prioritization (lib/utils/scraper.ts)
- [ ] Create comprehensive metadata extractor including structured data (lib/utils/metadata-extractor.ts)
- [ ] Implement Redis caching layer with TTL (lib/utils/scraper-cache.ts)
- [ ] Add Puppeteer support for JS-heavy sites (lib/utils/puppeteer-scraper.ts)
- [ ] Extend API schemas for enhanced metadata and stats (lib/schemas/api.ts)
- [ ] Update content limits and add new constants (lib/constants/app.ts)
- [ ] Refactor scrape-landing API route to use new utilities (app/api/scrape-landing/route.ts)
- [ ] Write comprehensive test suite for scraping functionality (test/scraper.test.ts)
- [ ] Create scraping system documentation (docs/SCRAPING.md)