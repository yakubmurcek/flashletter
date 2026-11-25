import { type APIRequestContext, expect, type Page } from '@playwright/test'

/** Password of every fake user in supabase/seed.sql. */
export const PASSWORD = 'password123'

export async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

/** Signs up a brand-new user, so a test never depends on what earlier runs left behind. */
export async function signUpNewUser(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
  await page.goto('/signup')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  // Shown only outside the EU/US; ticking it when present is what a user must do.
  const consent = page.getByRole('checkbox')
  if (await consent.isVisible()) await consent.check()
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page).not.toHaveURL(/\/signup/)
  await giveOwnClientIp(page)
  return email
}

/**
 * Every test runs from 127.0.0.1, so the per-address generation limit would add up
 * across the whole run. A new user generates from an address of its own, as a real
 * one would; on Vercel the platform sets this header itself.
 */
async function giveOwnClientIp(page: Page) {
  const ip = `10.${[0, 0, 0].map(() => Math.floor(Math.random() * 254) + 1).join('.')}`
  await page.route('**/api/generate-emails/**', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-real-ip': ip } }),
  )
}

/** Port of e2e/fake-claude.mjs; playwright.config.ts starts it there. */
export const FAKE_CLAUDE_URL = 'http://127.0.0.1:4517'

/** Makes the fake Claude fail every request that contains `marker` ("up" ends it). */
export async function setClaudeOutage(
  request: APIRequestContext,
  marker: string,
  mode: '500' | 'hang' | 'up',
) {
  const res = await request.post(`${FAKE_CLAUDE_URL}/__outage`, { data: { marker, mode } })
  expect(res.ok()).toBe(true)
}
