# Flashletter

Flashletter - Lightning-fast AI email campaigns. Generate complete email sequences in seconds by analyzing your landing page with Claude.

## Features

- 🚀 **Landing Page Analysis** - Automatically scrapes and analyzes your landing page content
- 🤖 **AI-Powered Email Generation** - Uses Claude (Anthropic) to write the sequence from your page
- 💬 **AI Chat Assistant** - Get real-time help with email optimization and copywriting
- ✏️ **Full Editor** - Edit and customize every aspect of your generated emails
- 🎨 **Modern UI** - Beautiful, responsive interface built with Next.js and Tailwind CSS
- ⚙️ **Flexible Configuration** - Customize tone, campaign type, and duration
- 🔐 **User Authentication** - Secure sign up and login with Supabase Auth
- 💾 **Database Storage** - All campaigns and emails persisted in Supabase
- 📝 **Version History** - Track changes to your emails over time
- 🔄 **Auto-save** - Your work is automatically saved as you edit
- 💳 **Plans & Billing** - Free plan limits and a Stripe-billed Pro plan with self-serve customer portal
- 🛡️ **Rate Limiting** - Built-in protection against API abuse with Redis-based rate limiting
- ⚡ **Retry Logic** - The Anthropic SDK retries rate limits and server errors with backoff

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Supabase** (Database & Authentication)
- **Anthropic API** (Claude Sonnet 5.5, via `lib/ai.ts`)
- **Upstash Redis** (Rate Limiting)
- **Tailwind CSS**
- **shadcn/ui**
- **Framer Motion**
- **Zod** for validation

## Prerequisites

- Node.js 20+ or Bun 1.0+
- pnpm (recommended) or npm
- Anthropic API key
- Supabase account and project

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd flashletter
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start the local database

Development runs against a local Supabase in Docker, never the live project. It is built
from `supabase/migrations/` and filled with fake users from `supabase/seed.sql`
(`alice@example.com` and `bob@example.com`, password `password123`).

```bash
pnpm db:start     # first run downloads the images; prints the local URL and keys
pnpm db:reset     # rebuild from migrations + seed at any time
```

Put the printed `API_URL` and `PUBLISHABLE_KEY` into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Live keys live only in the hosting provider's settings.

**Changing the database:** add a migration (`pnpm exec supabase migration new <what>`, or edit the local
database and run `pnpm exec supabase db diff -f <what>`), run `pnpm db:reset`, then `pnpm db:schema` to
refresh `supabase/schemas/public.sql`, the whole schema in one readable file. CI rebuilds the database
from the migrations and fails when that file disagrees. Every migration must keep the running app
working (add a column, ship the code that uses it, drop the old one later), because a deploy can be
rolled back but a migration cannot.

### 4. Configure environment variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Add your keys to `.env.local`:

```
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Billing (optional; without it, upgrade buttons report billing as unavailable)
STRIPE_SECRET_KEY=sk_test_your-key-here

# Optional (for rate limiting in production)
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

> **Get your Anthropic API key:** Visit the [Claude Console](https://platform.claude.com/settings/keys)  
> **Get your Supabase keys:** Visit your [Supabase project settings](https://app.supabase.com) → API  
> **Get Upstash Redis credentials (optional):** Sign up at [Upstash](https://upstash.com) and create a Redis database

**Note:** Upstash Redis is optional. Without it, rate limits are kept in each server instance's memory (weaker: serverless instances count separately). On Vercel, adding Upstash for Redis from the Marketplace switches to shared limits: the app also reads the `KV_REST_API_URL` / `KV_REST_API_TOKEN` it injects.

**Billing:** Stripe is the source of truth for who pays (customers carry `metadata.user_id`; no webhook or subscriptions table). Run `STRIPE_SECRET_KEY=sk_... node scripts/stripe-setup.mjs https://your-domain` once per Stripe mode (test, then live) to create the Pro product, the `flashletter_pro_monthly` / `flashletter_pro_yearly` prices and the customer-portal settings. Plan limits live in `lib/billing/plans.ts` and are enforced in the generate and chat routes.

Billing caveats: a just-created Stripe customer is found via `customers.list` by email, because Stripe's search index lags about a minute. During a Stripe outage a user keeps the plan Stripe last confirmed for them (kept 40 days in Redis), so payers are not locked out and nobody gets Pro for free; a user never seen before gets Free. Without Redis, everyone gets Free during an outage. The monthly AI-rewrite allowance is only counted when Redis is configured.

### 5. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. First-time setup

1. Sign up for a new account at `/signup`
2. Check your email for confirmation (if email confirmation is enabled)
3. Sign in and start creating campaigns!

## Usage

### 1. Sign Up / Sign In

- Create an account or sign in to access your campaigns
- All your campaigns are saved and accessible from any device

### 2. Create a New Campaign

- Click "New Campaign" or "Start Creating"
- Enter the URL of your landing page
- The app will automatically scrape and analyze the content

### 3. Configure Campaign

- **Tone**: Choose from Professional, Friendly, Casual, Formal, or Enthusiastic
- **Campaign Type**: Select Nurture, Onboarding, Promotional, Educational, or Re-engagement
- **Duration**: Set the number of days (3-30 emails)

### 4. Generate & Edit

- Click "Generate Campaign" to create AI-powered emails
- Edit any email using the built-in editor
- Changes are automatically saved to the database
- Use the AI Assistant for suggestions and improvements

### 5. Manage Campaigns

- View all your campaigns from the "My Campaigns" page
- Edit existing campaigns
- Track version history of your emails
- Export or deploy your campaigns

## API Routes

### POST `/api/scrape-landing`

Scrapes and analyzes a landing page.

**Request:**

```json
{
  "url": "https://example.com/landing-page"
}
```

**Response:**

```json
{
  "content": "Extracted text content...",
  "metadata": {
    "title": "Page Title",
    "description": "Meta description",
    "ogTitle": "OG Title",
    "ogDescription": "OG Description"
  },
  "url": "https://example.com/landing-page"
}
```

### POST `/api/generate-emails`

Generates email campaign using Claude.

**Request:**

```json
{
  "landingUrl": "https://example.com",
  "landingContent": "Page content...",
  "config": {
    "tone": "professional",
    "campaignType": "nurture",
    "days": 7
  }
}
```

**Response:**

```json
{
  "emails": [
    {
      "day": 1,
      "subject": "Welcome to our community",
      "preview": "Get started with...",
      "content": "# Email content in markdown..."
    }
  ],
  "usage": {
    "prompt_tokens": 1234,
    "completion_tokens": 567,
    "total_tokens": 1801
  }
}
```

### POST `/api/chat`

AI chat assistant for email optimization.

**Request:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": "How can I improve this subject line?"
    }
  ],
  "emailContext": {
    "subject": "Welcome Email",
    "content": "Email content...",
    "campaignType": "nurture"
  }
}
```

**Response:**

```json
{
  "message": "Here are some tips to improve...",
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 89,
    "total_tokens": 212
  }
}
```

## Project Structure

```
flashletter/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # AI chat endpoint
│   │   ├── generate-emails/route.ts # Email generation endpoint
│   │   └── scrape-landing/route.ts  # Landing page scraper
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── ai-chat-assistant.tsx       # AI chat interface
│   ├── configuration-step.tsx      # Campaign config form
│   ├── email-editor.tsx            # Main editor interface
│   ├── email-list.tsx              # Email list sidebar
│   ├── email-preview.tsx           # Email preview/editor
│   ├── landing-page.tsx            # Main landing page
│   └── url-input-step.tsx          # URL input form
├── lib/
│   ├── ai.ts                       # Claude client + structured-output helper
│   ├── types.ts                    # TypeScript types
│   └── utils.ts                    # Utility functions
└── .env.local                      # Environment variables
```

## Environment Variables

| Variable                        | Description                    | Required |
| ------------------------------- | ------------------------------ | -------- |
| `ANTHROPIC_API_KEY`             | Your Anthropic API key         | Yes      |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL      | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key         | Yes      |
| `UPSTASH_REDIS_REST_URL`        | Upstash Redis URL (rate limit) | No       |
| `UPSTASH_REDIS_REST_TOKEN`      | Upstash Redis token            | No       |

**Rate Limiting:** For production deployments, it's recommended to configure Upstash Redis to enable rate limiting. See [RATE_LIMITING.md](./RATE_LIMITING.md) for details.

## Cost Considerations

This app uses Claude Sonnet 5.5 at medium effort ($2 per million input tokens, $10 per million output tokens).
The system prompt is
prompt-cached. See [Anthropic pricing](https://www.anthropic.com/pricing#api).

## End-to-end tests

`pnpm test:e2e` runs the main user flows in a real browser (desktop and phone) against a production
build and the local database (`pnpm db:start` first). Claude is replaced by a local fake
(`e2e/fake-claude.mjs`), so the tests cost nothing and never depend on the real model. The upgrade
flow runs when `STRIPE_SECRET_KEY_TEST` holds a Stripe test-mode key and stops at Stripe's checkout page.

## Development

### Build for production

```bash
pnpm build
```

### Run production server

```bash
pnpm start
```

### Lint code

```bash
pnpm lint
```

Two linters, both blocking in CI (`format · lint · typecheck`):

- **Biome** (`biome.json`): the main linter, recommended rules plus the React and Next.js sets.
  Runs on staged files at every commit.
- **ESLint** (`eslint.config.mjs`): only `no-floating-promises` and `no-misused-promises`, which need
  TypeScript's types. They catch a save or load nobody waits for, so its failure is never seen.
  Biome's own version of the rule missed un-awaited Supabase queries (tested on Biome 2.6.6).
  Ends with `.catch(...)` or is marked `void` when the called function reports its own errors.

### Copy-paste and test coverage

```bash
pnpm dupes          # jscpd: duplicated code in app/, components/, lib/, middleware.ts
pnpm test:coverage  # Vitest with v8 coverage, prints a summary
```

Both run in CI's `format · lint · typecheck` job. `pnpm dupes` fails when duplication goes over the
`threshold` in `.jscpd.json`, set to the value on 2026-11-27 (2.19%, 36 clones). When duplication
drops, lower the threshold; never raise it. The threshold is a share of all lines, so deleting
unduplicated code can also push it over: then remove a clone or two in the same PR. Coverage is reported, not enforced (2026-11-27: 52.9% of
lines, 80.4% of branches).

### Quality baseline (2026-11-25)

Biome found older code breaking 17 rules in 63 file entries. Those files are listed per rule in
`biome.json` `overrides`, so the rule is off only there and on for every other and every new file.
Fixing a file means deleting it from its list; the lists only shrink. The biggest:
`noNonNullAssertion` 17 files, `noExplicitAny` 10, `useButtonType` 6, `useExhaustiveDependencies` 5,
`noArrayIndexKey` 5.

## Troubleshooting

### "Missing environment variable"

- Make sure you've created `.env.local` and added all required keys
- Restart the development server after adding environment variables

### "Failed to generate emails"

- Verify your Anthropic API key is valid
- Check you have credits in the Claude Console
- Review the console for detailed error messages

### "Too many requests" (429 error)

- You've hit the rate limit for the API endpoint
- Wait for the cooldown period (shown in error headers)
- For production, configure Upstash Redis for better rate limiting
- Claude rate limits are automatically retried by the Anthropic SDK

### "Authentication error"

- Make sure your Supabase URL and anon key are correct
- Check that your Supabase project is active
- Verify email confirmation settings in Supabase dashboard

### Landing page scraping fails

- Some websites block scraping or require authentication
- Try with a publicly accessible URL
- CORS issues won't affect server-side scraping

### Database errors

- Ensure your Supabase project has the correct schema
- Check Row Level Security (RLS) policies are enabled
- Review Supabase logs for detailed error messages

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
