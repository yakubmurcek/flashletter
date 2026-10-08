import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

const getUserMock = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: () => getUserMock() },
  }),
}))

import { SendTestDialog } from '@/components/editor/send-test-dialog'

const VALID_CAMPAIGN_ID = '11111111-1111-1111-1111-111111111111'

beforeEach(() => {
  toastSuccessMock.mockReset()
  toastErrorMock.mockReset()
  getUserMock.mockReset()
})

afterEach(() => {
  cleanup()
})

function renderDialog() {
  return render(
    <SendTestDialog
      campaignId={VALID_CAMPAIGN_ID}
      emailDay={1}
      emailSubject="Welcome to the loop"
      trigger={<button type="button">Open send dialog</button>}
    />,
  )
}

describe('<SendTestDialog />', () => {
  it('authed user: posts campaignId + emailDay only, never recipientEmail', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u', email: 'real@user.com', is_anonymous: false } },
    })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, sentTo: 'real@user.com', upgradeStarted: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: /open send dialog/i }))

    // Wait for the auth check to resolve; the "Sending to <email>" line is the
    // single visible signal that the authed branch took over.
    // The email lives in its own <span>, separate from the "Sending to "
    // text node, so a regex that spans whitespace won't match. Match the
    // span's exact contents instead.
    await screen.findByText('real@user.com')
    expect(screen.queryByLabelText(/your email/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /send test/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body).toEqual({ campaignId: VALID_CAMPAIGN_ID, emailDay: 1 })
    // Defense in depth: even if a future caller passes recipientEmail, the
    // authed branch must not include it. The route also guards this; the dialog
    // shouldn't be the place that breaks the contract.
    expect(body.recipientEmail).toBeUndefined()

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled())
  })

  it('anonymous user: includes recipientEmail in the request body', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'anon', email: undefined, is_anonymous: true } },
    })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, sentTo: 'new@user.com', upgradeStarted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: /open send dialog/i }))

    const input = await screen.findByLabelText(/your email/i)
    fireEvent.change(input, { target: { value: 'new@user.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send test/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({
      campaignId: VALID_CAMPAIGN_ID,
      emailDay: 1,
      recipientEmail: 'new@user.com',
    })
    // The success copy diverges based on upgradeStarted; assert we picked the
    // upgrade-aware branch so the anon user actually sees the "save your
    // campaign" hint that justifies the email capture.
    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith(expect.stringMatching(/confirmation link/i)),
    )
  })

  it('error response: surfaces a toast and does not close the dialog', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u', email: 'real@user.com', is_anonymous: false } },
    })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'rate limit', message: 'Slow down.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: /open send dialog/i }))
    // The email lives in its own <span>, separate from the "Sending to "
    // text node, so a regex that spans whitespace won't match. Match the
    // span's exact contents instead.
    await screen.findByText('real@user.com')
    fireEvent.click(screen.getByRole('button', { name: /send test/i }))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Slow down.'))
    expect(toastSuccessMock).not.toHaveBeenCalled()
    // Dialog is still open — getByText throws if the element is gone, so
    // reaching this line is the assertion.
    screen.getByText('real@user.com')
  })
})
