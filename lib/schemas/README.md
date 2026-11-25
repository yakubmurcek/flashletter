# Schema Organization

This directory contains all Zod schemas for the application, organized for clarity and reusability.

## Structure

```
lib/schemas/
├── index.ts         # Core domain schemas and types
├── api.ts          # API request/response schemas
├── analysis.ts     # Landing page analysis (AI output and user-edited)
├── bounded-array.ts # boundedArray(): length-checked array for request bodies
└── README.md       # This file
```

## Core Schemas (`index.ts`)

### Domain Models

- `emailSchema` - Email object with content
- `campaignConfigSchema` - Campaign configuration (tone, type, days)
- `landingPageDataSchema` - Landing page data and metadata
- `campaignSchema` - Campaign from database
- `campaignWithEmailsSchema` - Campaign with associated emails

### Chat/AI Related

- `messageSchema` - Chat message structure
- `emailContextSchema` - Email context for AI chat
- `selectedContextSchema` - Selected text context
- `campaignContextSchema` - Full campaign context for chat
- `chatRequestSchema` - Chat API request
- `emailEditSchema` - AI email edit response

### AI Responses

- `aiEmailsResponseSchema` - Email generation output from Claude

## API Schemas (`api.ts`)

These schemas define API contracts for request/response validation:

- `generateEmailsRequestSchema` - Generate emails endpoint request
- `scrapeLandingRequestSchema` - Scrape landing page request
- `scrapeLandingResponseSchema` - Scrape landing page response

## Usage

### Import from centralized location:

```typescript
// Import schemas and types
import { emailSchema, campaignConfigSchema, type Email, type CampaignConfig } from '@/lib'

// Or from specific schema module
import { generateEmailsRequestSchema } from '@/lib/schemas/api'
```

### API Routes

API routes should import and use these schemas for validation:

```typescript
import { generateEmailsRequestSchema } from '@/lib'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const validatedData = generateEmailsRequestSchema.parse(body)
  // ... handle request
}
```

### Claude Structured Outputs

Pass a schema to `generateStructured()`; it is converted to JSON Schema for Claude's
structured outputs and the response is validated with the same zod schema:

```typescript
import { generateStructured } from '@/lib/ai'
import { aiEmailsResponseSchema } from '@/lib'

const { emails } = await generateStructured({
  system: instructions,
  messages: [{ role: 'user', content: 'Generate Day 1 only.' }],
  schema: aiEmailsResponseSchema,
})
```

## Principles

1. **Single Source of Truth**: Each schema is defined once and imported where needed
2. **Type Safety**: All schemas export corresponding TypeScript types
3. **Separation of Concerns**:
   - Core domain schemas in `index.ts`
   - API-specific schemas in `api.ts`
4. **Backwards Compatibility**: Old schema locations re-export from centralized location
5. **Validation**: All API inputs/outputs are validated with Zod schemas
6. **Bounded request arrays**: an array read from a request body uses `boundedArray(item, max)`, not `z.array()`. Zod 3 checks every element even after `.max()` fails, so a huge junk array costs hundreds of MB of memory (GHSA-mrhx-c7xc-m3w5)

## Migration Notes

All schemas have been consolidated from:

- `lib/schemas.ts` (deleted)
- `app/api/chat/schemas.ts` (now re-exports)
- Inline schemas in route files (moved to centralized location)

The old locations are kept for backwards compatibility and re-export from the new centralized schemas.
