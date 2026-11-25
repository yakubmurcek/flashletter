import { describe, it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'

const updateCampaign = vi.fn()
const logErrorMock = vi.fn()
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
vi.mock('@/lib/utils/error-handling', () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}))
vi.mock('@/lib/services/campaign-storage.service', () => ({
  CampaignStorageService: class {
    getCampaign = async (id: string) => ({ id, name: 'Launch', emails: [] })
    updateCampaign = updateCampaign
  },
}))

import { CampaignProvider } from '@/lib/campaign/provider'
import { useCampaignActions } from '@/lib/campaign/contexts'

const wrapper = ({ children }: { children: ReactNode }) => (
  <CampaignProvider>{children}</CampaignProvider>
)

describe('updateCampaignConfig', () => {
  // The editor changes settings without waiting for the save. A failed save used
  // to escape as an unhandled error, so nobody ever saw the settings were lost.
  it('reports a failed settings save instead of losing it silently', async () => {
    const failure = new Error('network down')
    updateCampaign.mockRejectedValue(failure)
    const { result } = renderHook(() => useCampaignActions(), { wrapper })
    await act(() => result.current.loadCampaign('c1'))

    await act(() =>
      result.current.updateCampaignConfig({ tone: 'friendly', campaignType: 'launch', days: 5 }),
    )

    expect(updateCampaign).toHaveBeenCalledWith('c1', expect.objectContaining({ days: 5 }))
    expect(logErrorMock).toHaveBeenCalledWith(
      failure,
      expect.objectContaining({ operation: 'save campaign config', campaignId: 'c1' }),
    )
  })
})
