import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

/**
 * Stripe refuses the app (its key is invalid, as when Stripe is down or the key
 * was rotated): a user who clicks Upgrade is told plainly, nothing is charged, and
 * the rest of the app keeps working with their campaigns and plan.
 * The server's key is fixed per run, so this runs only in its own pass with an
 * invalid key (E2E_STRIPE_OUTAGE=1, see the CI e2e job).
 */
test('Stripe refusing the key: Upgrade says so, the app keeps working', async ({ page }) => {
  test.skip(!process.env.E2E_STRIPE_OUTAGE, 'runs in the invalid-Stripe-key pass only')
  await signIn(page, 'bob@example.com')

  await page.goto('/pricing')
  const upgrade = page
    .getByRole('button', { name: /Upgrade to Pro/ })
    .filter({ visible: true })
    .first()
  await upgrade.click()
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: /Payments are not reachable right now/ })
      .filter({ visible: true }),
  ).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(/\/pricing/)
  await expect(upgrade).toBeEnabled()

  // Their account and campaigns are all still there.
  for (const path of ['/account', '/campaigns', '/create']) {
    const res = await page.goto(path)
    expect(res?.status(), path).toBeLessThan(500)
    await expect(page.getByText(/something went wrong|application error/i)).toHaveCount(0)
  }
  await page.goto('/account')
  await expect(page.getByText(/Free/).filter({ visible: true }).first()).toBeVisible()
})
