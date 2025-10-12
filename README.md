# Flashletter

Flashletter - Lightning-fast AI email campaigns. Generate complete email sequences in seconds by analyzing your landing page with OpenAI.

## Features

- 🚀 **Landing Page Analysis** - Automatically scrapes and analyzes your landing page content
- 🤖 **AI-Powered Email Generation** - Uses OpenAI GPT-4 to create personalized email campaigns
- 💬 **AI Chat Assistant** - Get real-time help with email optimization and copywriting
- ✏️ **Full Editor** - Edit and customize every aspect of your generated emails
- 🎨 **Modern UI** - Beautiful, responsive interface built with Next.js and Tailwind CSS
- ⚙️ **Flexible Configuration** - Customize tone, campaign type, and duration
- 🔐 **User Authentication** - Secure sign up and login with Supabase Auth
- 💾 **Database Storage** - All campaigns and emails persisted in Supabase
- 📝 **Version History** - Track changes to your emails over time
- 🔄 **Auto-save** - Your work is automatically saved as you edit

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Supabase** (Database & Authentication)
- **OpenAI API** (GPT-4)
- **Tailwind CSS**
- **shadcn/ui**
- **Framer Motion**
- **Zod** for validation

## Prerequisites

- Node.js 20+ or Bun 1.0+
- pnpm (recommended) or npm
- OpenAI API key
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

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. The database schema will be automatically created when you first start the app
3. Get your project URL and anon key from the Supabase dashboard

### 4. Configure environment variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Add your keys to `.env.local`:

```
OPENAI_API_KEY=sk-your-openai-api-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Get your OpenAI API key:** Visit [OpenAI Platform](https://platform.openai.com/api-keys) > **Get your Supabase keys:** Visit your [Supabase project settings](https://app.supabase.com) → API

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
│   ├── openai.ts                   # OpenAI client config
│   ├── types.ts                    # TypeScript types
│   └── utils.ts                    # Utility functions
└── .env.local                      # Environment variables
```

## Environment Variables

| Variable                        | Description               | Required |
| ------------------------------- | ------------------------- | -------- |
| `OPENAI_API_KEY`                | Your OpenAI API key       | Yes      |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key    | Yes      |

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

### "Missing environment variable"

- Make sure you've created `.env.local` and added all required keys
- Restart the development server after adding environment variables

### "Failed to generate emails"

- Verify your OpenAI API key is valid
- Check you have sufficient credits in your OpenAI account
- Review the console for detailed error messages

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
