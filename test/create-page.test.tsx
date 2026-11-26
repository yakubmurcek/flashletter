import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { must } from './_helpers/must'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

const routerPushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const createNewCampaignMock = vi.fn()
vi.mock('@/lib/campaign-context', () => ({
  useCampaign: () => ({
    setLandingPageData: vi.fn(),
    createNewCampaign: createNewCampaignMock,
    isLoading: false,
    clearAll: vi.fn(),
  }),
}))

vi.mock('@/lib/hooks/use-anonymous-limit', () => ({
  useAnonymousLimit: () => ({
    isLoading: false,
    isAnonymous: true,
    canCreate: true,
    campaignCount: 0,
    campaignLimit: 1,
  }),
}))

vi.mock('@/components/layouts/app-shell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/billing/upgrade-button', () => ({ UpgradeButton: () => null }))
vi.mock('@/components/auth/upgrade-prompt', () => ({ UpgradePrompt: () => null }))
vi.mock('@/components/campaign/scrape-progress-overlay', () => ({
  ScrapeProgressOverlay: () => null,
}))

import CreatePage from '@/app/create/page'

function ndjson(lines: unknown[], status = 200): Response {
  return new Response(`${lines.map((l) => JSON.stringify(l)).join('\n')}\n`, {
    status,
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}

const urlInput = () => screen.getByLabelText('Landing page URL') as HTMLInputElement
const submitButton = () => screen.getByRole('button') as HTMLButtonElement

async function submit(url: string) {
  fireEvent.change(urlInput(), { target: { value: url } })
  fireEvent.submit(must(urlInput().closest('form')))
}

async function expectRetryWorks(fetchMock: MockInstance<typeof fetch>) {
  await waitFor(() => expect(submitButton().disabled).toBe(false))
  expect(submitButton().textContent).toContain('Continue')

  fetchMock.mockResolvedValue(ndjson([{ type: 'error', message: 'still down' }]))
  await submit('https://second.example.com')
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  const body = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body))
  expect(body.url).toBe('https://second.example.com')
  await waitFor(() => expect(submitButton().disabled).toBe(false))
}

describe('CreatePage retry after a failed scrape', () => {
  beforeEach(() => {
    routerPushMock.mockReset()
    createNewCampaignMock.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('re-enables the button after the stream sends an error event', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        ndjson([{ type: 'error', message: "We couldn't reach that site. Check the address." }]),
      )
    render(<CreatePage />)
    await submit('https://first.example.com')

    await screen.findByText(/couldn't reach that site/)
    await expectRetryWorks(fetchMock)
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('re-enables the button after a non-OK response', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
      )
    render(<CreatePage />)
    await submit('https://first.example.com')

    await screen.findByText('Too many requests')
    await expectRetryWorks(fetchMock)
  })

  it('re-enables the button after fetch throws', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    render(<CreatePage />)
    await submit('https://first.example.com')

    await screen.findByText(/check your connection/i)
    expect(screen.queryByText('Failed to fetch')).toBeNull()
    await expectRetryWorks(fetchMock)
  })

  it('never shows the raw text of a broken stream', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(ndjson([]))
    render(<CreatePage />)
    await submit('https://first.example.com')

    await screen.findByText(/couldn't read that page/i)
    expect(screen.queryByText(/stream closed/i)).toBeNull()
  })

  it('re-enables the button after the request is aborted', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'))
    render(<CreatePage />)
    await submit('https://first.example.com')

    await expectRetryWorks(fetchMock)
  })

  it('clears the old error once the visitor edits the URL', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      ndjson([{ type: 'error', message: 'That site took too long to respond.' }]),
    )
    render(<CreatePage />)
    await submit('https://first.example.com')
    await screen.findByText(/took too long/)

    fireEvent.change(urlInput(), { target: { value: 'https://first.example.co' } })
    expect(screen.queryByText(/took too long/)).toBeNull()
  })
})
