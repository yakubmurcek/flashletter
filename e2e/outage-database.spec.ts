import { expect, test } from '@playwright/test'
import { signUpNewUser } from './helpers'

/**
 * The database drops out while a user edits an email: they are told the edit is not
 * saved yet, and once the connection is back it saves by itself, without another
 * keystroke, so a reload still shows it. The browser's own requests to the database
 * are cut, so only this page loses the database.
 */
test('database unreachable during autosave: told so, and the edit is kept', async ({ page }) => {
  test.setTimeout(120_000)
  await signUpNewUser(page)
  await page.goto('/create')
  await page.getByLabel('Landing page URL').fill('https://example.com')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/create\/configure/, { timeout: 45_000 })
  const stream = page.waitForResponse((r) => r.url().includes('/api/generate-emails/stream'))
  await page.getByRole('button', { name: 'Generate Campaign' }).click()
  await (await stream).finished()
  const subject = page.getByRole('textbox', { name: 'Subject' }).filter({ visible: true })
  await expect(subject).toHaveValue('Fake day 1 subject', { timeout: 45_000 })

  await page.route('**/rest/v1/**', (route) => route.abort('internetdisconnected'))
  await subject.fill('Edited while the database was down')
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: /not saved yet/ })
      .filter({ visible: true }),
  ).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Not saved', { exact: true }).filter({ visible: true })).toBeVisible()

  // The database is back; the user types nothing more.
  await page.unroute('**/rest/v1/**')
  await expect(page.getByText('Saved', { exact: true }).filter({ visible: true })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByRole('alert').filter({ hasText: /not saved yet/ })).toHaveCount(0)
  await page.reload()
  await expect(subject).toHaveValue('Edited while the database was down')
})
