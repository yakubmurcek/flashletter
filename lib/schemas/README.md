# Schema Organization

This directory contains all Zod schemas for the application, organized for clarity and reusability.

## Structure

```
lib/schemas/
├── index.ts         # Core domain schemas and types
├── api.ts          # API request/response schemas
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

### OpenAI Responses

- `emailsResponseSchema` - Email generation response

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

### OpenAI Structured Outputs

Use schemas with OpenAI's structured output helpers:

```typescript
import { zodTextFormat } from 'openai/helpers/zod'
import { emailsResponseSchema } from '@/lib'

const response = await openai.responses.parse({
  model: 'gpt-4o',
  input: [...],
  text: {
    format: zodTextFormat(emailsResponseSchema, 'emails_response'),
  },
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

## Migration Notes

All schemas have been consolidated from:

- `lib/schemas.ts` (deleted)
- `app/api/chat/schemas.ts` (now re-exports)
- Inline schemas in route files (moved to centralized location)

The old locations are kept for backwards compatibility and re-export from the new centralized schemas.
