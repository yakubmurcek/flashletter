# AI Newsletter Generator

An AI-powered newsletter campaign generator that analyzes your landing page and creates complete email sequences using OpenAI.

## Features

- 🚀 **Landing Page Analysis** - Automatically scrapes and analyzes your landing page content
- 🤖 **AI-Powered Email Generation** - Uses OpenAI GPT-4 to create personalized email campaigns
- 💬 **AI Chat Assistant** - Get real-time help with email optimization and copywriting
- ✏️ **Full Editor** - Edit and customize every aspect of your generated emails
- 🎨 **Modern UI** - Beautiful, responsive interface built with Next.js and Tailwind CSS
- ⚙️ **Flexible Configuration** - Customize tone, campaign type, and duration

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **OpenAI API** (GPT-4)
- **Tailwind CSS**
- **shadcn/ui**
- **Framer Motion**
- **Zod** for validation

## Prerequisites

- Node.js 20+ or Bun 1.0+
- pnpm (recommended) or npm
- OpenAI API key

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd v0-newsletter-generator
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Add your OpenAI API key to `.env.local`:

```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

> **Get your API key:** Visit [OpenAI Platform](https://platform.openai.com/api-keys) to create an API key.

### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Enter Landing Page URL

- Start by entering the URL of your landing page
- The app will automatically scrape and analyze the content

### 2. Configure Campaign

- **Tone**: Choose from Professional, Friendly, Casual, Formal, or Enthusiastic
- **Campaign Type**: Select Nurture, Onboarding, Promotional, Educational, or Re-engagement
- **Duration**: Set the number of days (3-30 emails)

### 3. Generate & Edit

- Click "Generate Campaign" to create AI-powered emails
- Edit any email using the built-in editor
- Use the AI Assistant for suggestions and improvements
- Export or deploy your campaign

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

Generates email campaign using OpenAI.

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
v0-newsletter-generator/
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
│   ├── openai.ts                   # OpenAI client config
│   ├── types.ts                    # TypeScript types
│   └── utils.ts                    # Utility functions
└── .env.local                      # Environment variables
```

## Environment Variables

| Variable         | Description         | Required |
| ---------------- | ------------------- | -------- |
| `OPENAI_API_KEY` | Your OpenAI API key | Yes      |

## Cost Considerations

This app uses OpenAI's GPT-4o model. Costs depend on usage:

- **Email Generation**: ~1,500-3,000 tokens per campaign (varies by length)
- **Chat Assistance**: ~100-500 tokens per conversation
- **Pricing**: See [OpenAI Pricing](https://openai.com/api/pricing/)

Typical campaign generation costs $0.01-0.05 per generation.

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

## Troubleshooting

### "Missing OPENAI_API_KEY environment variable"

- Make sure you've created `.env.local` and added your API key
- Restart the development server after adding environment variables

### "Failed to generate emails"

- Verify your OpenAI API key is valid
- Check you have sufficient credits in your OpenAI account
- Review the console for detailed error messages

### Landing page scraping fails

- Some websites block scraping or require authentication
- Try with a publicly accessible URL
- CORS issues won't affect server-side scraping

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
