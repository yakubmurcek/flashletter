import { expect, test } from '@playwright/test'
import { signUpNewUser } from './helpers'

/**
 * The core value flow: a landing page in, a written email sequence out.
 * Claude is the fake from e2e/fake-claude.mjs, so this checks our pages, routes
 * and database, not the model's writing.
 */
test('a user turns a landing page into an email sequence', async ({ page }) => {
  test.setTimeout(90_000)
  // A new user, so the free plan's monthly campaign limit is never already used up.
  await signUpNewUser(page)
  await page.goto('/create')
  await page.getByLabel('Landing page URL').fill('https://example.com')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/create\/configure/, { timeout: 45_000 })

  // The stream ends with its "complete" event only after every email is saved.
  const stream = page.waitForResponse((r) => r.url().includes('/api/generate-emails/stream'))
  await page.getByRole('button', { name: 'Generate Campaign' }).click()
  await expect(page).toHaveURL(/\/create\/editor/, { timeout: 45_000 })
  // Day 1 shows first, then the rest of the sequence streams in.
  await expect(page.getByText('Fake day 1 subject').filter({ visible: true }).first()).toBeVisible({
    timeout: 45_000,
  })
  await expect(page.getByRole('button', { name: /Day 2/ }).first()).toBeVisible({ timeout: 45_000 })

  // The whole sequence was saved: after a reload, every day is still there.
  await expect(page.getByRole('button', { name: /Day 5/ }).first()).toBeVisible({ timeout: 45_000 })
  await (await stream).finished()
  await page.reload()
  await expect(page.getByText('Fake day 1 subject').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Day 5/ }).first()).toBeVisible()

  // And it is in the user's campaign list, named after the page ("Example Domain").
  await page.goto('/campaigns')
  await expect(page.getByText('Example Domain').filter({ visible: true }).first()).toBeVisible()
})
