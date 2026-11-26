import { expect, type Page } from '@playwright/test'

/** Password of every fake user in supabase/seed.sql. */
const PASSWORD = 'password123'

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
  return email
}
