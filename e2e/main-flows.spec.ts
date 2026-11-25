import { expect, test, type Page } from '@playwright/test'

/**
 * Main flows a real user goes through, end to end in a browser, against the
 * local database seeded with fake users (supabase/seed.sql).
 */

const PASSWORD = 'password123'
const ALICE = { email: 'alice@example.com', campaign: 'Alice launch' }
const BOB_CAMPAIGN_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const ALICE_CAMPAIGN_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

test('a new visitor signs up and lands signed in', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
  await page.goto('/signup')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  // Shown only outside the EU/US; ticking it when present is what a user must do.
  const consent = page.getByRole('checkbox')
  if (await consent.isVisible()) await consent.check()
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page).not.toHaveURL(/\/signup/)
  await page.goto('/account')
  await expect(page.getByText(email)).toBeVisible()
})

test('a signed-in user sees only their own campaigns', async ({ page }) => {
  await signIn(page, ALICE.email)
  await page.goto('/campaigns')
  await expect(page.getByText(ALICE.campaign).filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByText('Bob onboarding')).toHaveCount(0)
})

test("a user opens their campaign's emails in the editor", async ({ page }) => {
  await signIn(page, ALICE.email)
  await page.goto(`/campaigns/${ALICE_CAMPAIGN_ID}`)
  await expect(page).toHaveURL(new RegExp(`/create/editor\\?campaign=${ALICE_CAMPAIGN_ID}`))
  await expect(
    page.getByText(`${ALICE.campaign}: day 1`).filter({ visible: true }).first(),
  ).toBeVisible()
})

test("a user cannot open someone else's campaign by its link", async ({ page }) => {
  await signIn(page, ALICE.email)
  // The page streams behind a loading screen, so the HTTP status is already 200
  // when notFound() runs; what the user sees is the proof.
  await page.goto(`/campaigns/${BOB_CAMPAIGN_ID}`)
  await expect(page.getByText('Page not found')).toBeVisible()
  await expect(page).not.toHaveURL(/\/create\/editor/)
  await expect(page.getByText('Bob onboarding')).toHaveCount(0)
})

test('a signed-out visitor is sent to sign in before seeing campaigns', async ({ page }) => {
  await page.goto('/campaigns')
  await expect(page).toHaveURL(/\/login/)
})
