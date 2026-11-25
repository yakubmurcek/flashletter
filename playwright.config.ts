import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests of the main user flows, against the local Supabase
 * (`pnpm db:start`, fake users from supabase/seed.sql) and a production build.
 * Never against live: the URL and key below are the local stack's fixed demo values.
 */
const PORT = Number(process.env.E2E_PORT ?? 3417)
const FAKE_CLAUDE_PORT = 4517
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321'
// Supabase's public demo anon key, the same on every local stack.
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' // gitleaks:allow (public local demo key)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      // Stands in for Claude: free, instant, never down (e2e/fake-claude.mjs).
      command: 'node e2e/fake-claude.mjs',
      url: `http://127.0.0.1:${FAKE_CLAUDE_PORT}`,
      reuseExistingServer: false,
      env: { FAKE_CLAUDE_PORT: String(FAKE_CLAUDE_PORT) },
    },
    {
      command: process.env.E2E_SERVER ?? `pnpm build && pnpm start --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      // Never reuse: another app on the same port would silently answer the tests.
      reuseExistingServer: false,
      timeout: 300_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: LOCAL_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: LOCAL_ANON_KEY,
        NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
        ANTHROPIC_API_KEY: 'fake-key-for-e2e',
        ANTHROPIC_BASE_URL: `http://127.0.0.1:${FAKE_CLAUDE_PORT}`,
        // Stripe TEST mode only (sk_test_...); unset, the upgrade test is skipped.
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY_TEST ?? '',
      },
    },
  ],
})
