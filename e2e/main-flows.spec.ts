import { expect, test } from '@playwright/test'
import { signIn, signUpNewUser } from './helpers'

/**
 * Main flows a real user goes through, end to end in a browser, against the
 * local database seeded with fake users (supabase/seed.sql).
 */

const ALICE = { email: 'alice@example.com', campaign: 'Alice launch' }
const BOB_CAMPAIGN_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const ALICE_CAMPAIGN_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

test('a new visitor signs up and lands signed in', async ({ page }) => {
  const email = await signUpNewUser(page)
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
  const response = await page.goto(`/campaigns/${BOB_CAMPAIGN_ID}`)
  expect(response?.status()).toBe(404)
  await expect(page.getByText('Page not found')).toBeVisible()
  await expect(page).not.toHaveURL(/\/create\/editor/)
  await expect(page.getByText('Bob onboarding')).toHaveCount(0)
})

test('a campaign link that does not exist answers 404', async ({ page }) => {
  await signIn(page, ALICE.email)
  const response = await page.goto('/campaigns/00000000-0000-0000-0000-000000000000')
  expect(response?.status()).toBe(404)
  await expect(page.getByText('Page not found')).toBeVisible()
})

test('a signed-out visitor is sent to sign in before seeing campaigns', async ({ page }) => {
  await page.goto('/campaigns')
  await expect(page).toHaveURL(/\/login/)
})
