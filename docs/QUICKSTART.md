# Quick Start Guide

Get Flashletter up and running in 3 minutes.

## Step 1: Install Dependencies

```bash
pnpm install
```

## Step 2: Add Your Anthropic API Key

1. Copy the example environment file:

   ```bash
   cp .env.local.example .env.local
   ```

2. Get your Anthropic API key:
   - Visit [https://platform.claude.com/settings/keys](https://platform.claude.com/settings/keys)
   - Click "Create Key"
   - Copy the key

3. Add the key to `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

## Step 3: Run the App

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## What's Next?

1. **Enter a landing page URL** - Try with any publicly accessible website
2. **Configure your campaign** - Choose tone, type, and duration
3. **Generate emails** - Let AI create your campaign
4. **Edit & refine** - Use the built-in editor and AI assistant

## Example Landing Page URLs to Try

- https://claude.com
- https://vercel.com
- https://stripe.com/checkout
- Your own product landing page

## Need Help?

- Check the [README.md](./README.md) for detailed documentation
- Review the [API documentation](./README.md#api-routes)
- Open an issue if you encounter problems

## Tips

💡 **Best Results**: Use landing pages with clear product descriptions and value propositions

💡 **Cost**: Each campaign generation uses Claude API credits (Claude Opus 5.5)

💡 **Customization**: All generated emails are fully editable - use the AI assistant for suggestions

💡 **Test send**: Send any email to your own inbox from the editor before copying it into your ESP

---

That's it! You're ready to start generating AI-powered email campaigns. 🚀
