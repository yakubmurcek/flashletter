import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

const updateUserMock = vi.fn()
const linkIdentityMock = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      updateUser: (...args: unknown[]) => updateUserMock(...args),
      linkIdentity: (...args: unknown[]) => linkIdentityMock(...args),
    },
  }),
}))

const routerPushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
}))

let region: 'US' | 'OTHER' = 'US'
vi.mock('@/lib/utils/location-detection', () => ({
  useRegionDetection: () => ({
    locationInfo: { region, requiresGDPR: region === 'OTHER' },
    isLoading: false,
  }),
}))

import { UpgradePrompt } from '@/components/auth/upgrade-prompt'

const ANON_USER_ID = '11111111-1111-1111-1111-111111111111'
const ALREADY_HAVE_ACCOUNT =
  'You already have an account with that email. Sign in to pick up where you left off.'

beforeEach(() => {
  region = 'US'
  Element.prototype.scrollIntoView = vi.fn()
  updateUserMock.mockReset()
  linkIdentityMock.mockReset()
  routerPushMock.mockReset()
})

afterEach(() => {
  cleanup()
})

function fillForm(email = 'newuser@example.com', password = 'hunter2!') {
  fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } })
}

describe('<UpgradePrompt /> — email upgrade path', () => {
  it('renders the email + password form alongside Google', () => {
    render(<UpgradePrompt />)

    screen.getByRole('button', { name: /continue with google/i })
    screen.getByLabelText(/^email$/i)
    screen.getByLabelText(/^password$/i)
    screen.getByRole('button', { name: /create account/i })
  })

  it('calls updateUser with the entered credentials and redirects on success', async () => {
    updateUserMock.mockResolvedValue({
      data: { user: { id: ANON_USER_ID, is_anonymous: false, email: 'newuser@example.com' } },
      error: null,
    })

    render(<UpgradePrompt redirectTo="/campaigns" />)
    fillForm('newuser@example.com', 'hunter2!')
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() =>
      expect(updateUserMock).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'hunter2!',
      }),
    )
    await waitFor(() => expect(routerPushMock).toHaveBeenCalledWith('/campaigns'))
  })

  it('shows the confirmation-pending message when the user remains anonymous after updateUser', async () => {
    // Confirmations enabled in Supabase: updateUser returns success but the
    // session stays anon-flagged until the user clicks the email link.
    updateUserMock.mockResolvedValue({
      data: { user: { id: ANON_USER_ID, is_anonymous: true, email: null } },
      error: null,
    })

    render(<UpgradePrompt redirectTo="/campaigns" />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => screen.getByText(/check your inbox/i))
    // Don't navigate prematurely — the user hasn't actually completed the
    // upgrade yet, /campaigns would show no campaigns under the new identity.
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('points a returning customer to sign in when updateUser says the email is taken', async () => {
    // Supabase wraps real errors in AuthApiError (an Error subclass), not
    // plain objects — match that shape so the catch's `err instanceof Error`
    // branch fires.
    updateUserMock.mockResolvedValue({
      data: { user: null },
      error: new Error('A user with this email address has already been registered'),
    })

    render(<UpgradePrompt />)
    fillForm('taken@example.com', 'hunter2!')
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => screen.getByText(ALREADY_HAVE_ACCOUNT))
    expect(screen.queryByText(/already been registered/i)).toBeNull()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('still shows other updateUser errors as they come back', async () => {
    updateUserMock.mockResolvedValue({
      data: { user: null },
      error: new Error('Password should be at least 6 characters'),
    })

    render(<UpgradePrompt />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => screen.getByText(/at least 6 characters/i))
  })

  it('maps an "identity already linked" error from linkIdentity', async () => {
    linkIdentityMock.mockResolvedValue({
      data: { url: null },
      error: new Error('Identity is already linked to another user'),
    })

    render(<UpgradePrompt />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => screen.getByText(ALREADY_HAVE_ACCOUNT))
  })

  it('does not call updateUser if Google OAuth is in flight', async () => {
    // Verifies the cross-button disable: clicking Google sets oauthLoading,
    // which should prevent the email button from firing concurrently.
    linkIdentityMock.mockImplementation(
      () => new Promise(() => {}), // never resolves; keeps oauthLoading=true
    )

    render(<UpgradePrompt />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    // After OAuth click, the email submit button is disabled. fireEvent.click
    // on a disabled button does nothing; updateUser must not be reached.
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await new Promise((r) => setTimeout(r, 0))
    expect(updateUserMock).not.toHaveBeenCalled()
  })
})

describe('<UpgradePrompt /> — consent gate', () => {
  it('blocks Google and email signup until the consent box is ticked outside the US', async () => {
    region = 'OTHER'
    render(<UpgradePrompt />)

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(screen.getByRole('alert').textContent).toMatch(/tick this box/i)
    expect(linkIdentityMock).not.toHaveBeenCalled()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(updateUserMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox'))
    linkIdentityMock.mockResolvedValue({ data: { url: null }, error: null })
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    await waitFor(() => expect(linkIdentityMock).toHaveBeenCalledTimes(1))
  })
})

// A returning customer on a new device is a guest here. Google linking and
// email upgrade both fail because the identity is already theirs elsewhere;
// without a way to sign in they loop between /account and /signup.
describe('<UpgradePrompt /> — returning customer', () => {
  it.each([
    'Identity is already linked to another user',
    'User already registered',
    'Email address already exists',
    'identity_already_exists',
  ])('turns the callback error %j into a sign-in nudge', (raw) => {
    render(<UpgradePrompt initialError={raw} />)
    screen.getByText(ALREADY_HAVE_ACCOUNT)
  })

  it('does not echo an unknown error from the URL', () => {
    render(<UpgradePrompt initialError="Call 555-0100 to restore your account" />)
    expect(screen.queryByText(/555-0100/)).toBeNull()
    screen.getByText(/didn.t go through/i)
  })

  it.each(['save', 'limit'] as const)(
    'always offers sign in, keeping the checkout to resume (%s)',
    (variant) => {
      render(
        <UpgradePrompt
          variant={variant}
          redirectTo="/account?upgrade=month"
        />,
      )
      expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe(
        '/login?redirectTo=%2Faccount%3Fupgrade%3Dmonth',
      )
    },
  )

  it('links to plain /login when there is nowhere special to return to', () => {
    render(<UpgradePrompt redirectTo="/campaigns" />)
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login')
  })

  it('is honest that guest campaigns do not move on sign in', () => {
    render(<UpgradePrompt />)
    screen.getByText(/made as a guest stay in this browser/i)
  })
})
