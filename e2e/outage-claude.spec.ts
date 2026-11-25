import { expect, test } from '@playwright/test'
import { setClaudeOutage, signUpNewUser } from './helpers'

/**
 * Claude is down while a user generates: they see a plain message instead of an
 * endless spinner or an error dump, and once Claude is back, Try again writes the
 * sequence for the same page and settings. Each test switches off only its own
 * requests (a marker in the landing-page URL), so other tests keep a working fake.
 */
for (const mode of ['500', 'hang'] as const) {
  test(`Claude ${mode === '500' ? 'erroring' : 'not answering'}: an honest message, then the work resumes`, async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(120_000)
    const marker = `outage-${mode}-${testInfo.project.name}-${Date.now()}`
    await signUpNewUser(page)
    await page.goto('/create')
    await page.getByLabel('Landing page URL').fill(`https://example.com/?${marker}`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/\/create\/configure/, { timeout: 45_000 })

    await setClaudeOutage(request, marker, mode)
    await page.getByRole('button', { name: 'Generate Campaign' }).click()
    await expect(page).toHaveURL(/\/create\/editor/, { timeout: 45_000 })
    const message = page
      .getByText(/The AI writer is not reachable right now/)
      .filter({ visible: true })
    await expect(message.first()).toBeVisible({ timeout: 60_000 })
    await expect(
      page.getByText(/api_error|timed out|"type":"error"/).filter({ visible: true }),
    ).toHaveCount(0)

    // Claude is back: the campaign kept its page and settings, so one click finishes it.
    await setClaudeOutage(request, marker, 'up')
    await page.reload()
    await expect(page.getByText(/has its landing page and settings/).first()).toBeVisible()
    await page.getByRole('button', { name: 'Write the emails' }).click()
    await expect(
      page.getByText('Fake day 1 subject').filter({ visible: true }).first(),
    ).toBeVisible({
      timeout: 45_000,
    })
  })
}
