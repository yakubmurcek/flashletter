import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

/**
 * The money path: a free user clicks Upgrade and reaches Stripe's checkout page.
 * Uses the Stripe TEST key (CI secret STRIPE_SECRET_KEY_TEST); stops before paying.
 */
test('a free user clicks Upgrade and reaches Stripe checkout', async ({ page }) => {
  test.skip(!process.env.STRIPE_SECRET_KEY_TEST, 'needs STRIPE_SECRET_KEY_TEST (Stripe test mode)')
  await signIn(page, 'bob@example.com')
  await page.goto('/pricing')
  await page
    .getByRole('button', { name: /Upgrade to Pro/ })
    .filter({ visible: true })
    .first()
    .click()
  await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Subscribe to Flashletter Pro' })).toBeVisible({
    timeout: 30_000,
  })
  // Stripe marks test mode as "Sandbox": proof no real card can be charged here.
  await expect(page.getByText('Sandbox').first()).toBeVisible()
})
