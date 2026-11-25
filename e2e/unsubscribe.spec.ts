import { createHmac } from 'node:crypto'
import { expect, type APIRequestContext, test } from '@playwright/test'
import { fakeSecret } from '../playwright.config'

// Same secret the e2e build runs with (playwright.config.ts), same format as
// lib/utils/unsubscribe-token.ts: the link a real waitlist email carries.
const SECRET = fakeSecret('unsubscribe-')
const sign = (email: string) =>
  `${Buffer.from(email).toString('base64url')}.${createHmac('sha256', SECRET).update(email).digest('base64url')}`

const REST = 'http://127.0.0.1:54321/rest/v1'
// Supabase's public demo keys, the same on every local stack; used here only to
// check the outcome and to try the database directly the way an attacker could.
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' // gitleaks:allow (public local demo key)
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU' // gitleaks:allow (public local demo key)

async function isOnWaitlist(request: APIRequestContext, email: string) {
  const res = await request.get(
    `${REST}/waitlist?select=id&email=eq.${encodeURIComponent(email)}`,
    {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    },
  )
  expect(res.ok()).toBe(true)
  return ((await res.json()) as unknown[]).length === 1
}

async function joinWaitlist(request: APIRequestContext): Promise<string> {
  const email = `e2e-waitlist-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
  const res = await request.post('/api/waitlist', { data: { email, privacyConsent: true } })
  expect(res.ok()).toBe(true)
  expect(await isOnWaitlist(request, email)).toBe(true)
  return email
}

test('typing someone else’s email never removes them from the waitlist', async ({
  page,
  request,
}) => {
  const email = await joinWaitlist(request)

  // The page offers no form, only the link or the contact address.
  await page.goto('/unsubscribe')
  await expect(page.getByText('Use the unsubscribe link')).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(0)

  // Neither the route nor the database function takes a bare email.
  const viaRoute = await request.post('/api/waitlist/unsubscribe', { data: { email } })
  expect(viaRoute.status()).toBe(400)
  const viaDatabase = await request.post(`${REST}/rpc/waitlist_unsubscribe`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    data: { p_email: email },
  })
  expect(viaDatabase.ok()).toBe(false)

  expect(await isOnWaitlist(request, email)).toBe(true)
})

test('the link from a waitlist email removes the subscriber', async ({ page, request }) => {
  const email = await joinWaitlist(request)

  await page.goto(`/unsubscribe?token=${sign(email)}`)
  await expect(page.getByText('successfully removed from our waitlist')).toBeVisible()

  expect(await isOnWaitlist(request, email)).toBe(false)
})
