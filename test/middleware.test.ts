import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { middleware, config as middlewareConfig } from '@/middleware'
import { NextRequest } from 'next/server'

// Mock the supabase middleware
vi.mock('@/lib/supabase/middleware')

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updateSession with the request', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const mockResponse = { status: 200 }
    vi.mocked(updateSession).mockResolvedValue(mockResponse as any)

    const mockRequest = new NextRequest('http://localhost:3000/test')

    const result = await middleware(mockRequest)

    expect(vi.mocked(updateSession)).toHaveBeenCalledWith(mockRequest)
    expect(result).toEqual(mockResponse)
  })

  it('returns response from updateSession', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const mockResponse = { status: 200, body: 'Updated session' }
    vi.mocked(updateSession).mockResolvedValue(mockResponse as any)

    const mockRequest = new NextRequest('http://localhost:3000')

    const result = await middleware(mockRequest)

    expect(result).toBe(mockResponse)
  })

  it('handles protected routes', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({ status: 200 } as any)

    const mockRequest = new NextRequest('http://localhost:3000/create')

    await middleware(mockRequest)

    expect(vi.mocked(updateSession)).toHaveBeenCalledWith(mockRequest)
  })

  it('handles campaign routes', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({ status: 200 } as any)

    const mockRequest = new NextRequest('http://localhost:3000/campaigns')

    await middleware(mockRequest)

    expect(vi.mocked(updateSession)).toHaveBeenCalledWith(mockRequest)
  })

  it('handles API routes', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({ status: 200 } as any)

    const mockRequest = new NextRequest('http://localhost:3000/api/campaigns')

    await middleware(mockRequest)

    expect(vi.mocked(updateSession)).toHaveBeenCalledWith(mockRequest)
  })

  it('handles public routes', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({ status: 200 } as any)

    const mockRequest = new NextRequest('http://localhost:3000/login')

    await middleware(mockRequest)

    expect(vi.mocked(updateSession)).toHaveBeenCalledWith(mockRequest)
  })

  it('propagates errors from updateSession', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const error = new Error('Session update failed')
    vi.mocked(updateSession).mockRejectedValue(error)

    const mockRequest = new NextRequest('http://localhost:3000')

    await expect(middleware(mockRequest)).rejects.toBe(error)
  })

  it('handles different HTTP methods', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({ status: 200 } as any)

    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

    for (const method of methods) {
      const mockRequest = new NextRequest('http://localhost:3000', { method })
      await middleware(mockRequest)
      expect(vi.mocked(updateSession)).toHaveBeenCalledWith(mockRequest)
    }
  })

  it('exports config with matcher', () => {
    expect(middlewareConfig).toBeDefined()
    expect(middlewareConfig.matcher).toBeDefined()
    expect(Array.isArray(middlewareConfig.matcher)).toBe(true)
  })

  it('config matcher excludes static files', () => {
    expect(
      middlewareConfig.matcher.some((pattern: string) => pattern.includes('_next/static')),
    ).toBe(true)
  })

  it('config matcher excludes image optimization', () => {
    expect(
      middlewareConfig.matcher.some((pattern: string) => pattern.includes('_next/image')),
    ).toBe(true)
  })

  it('config matcher excludes favicon', () => {
    expect(
      middlewareConfig.matcher.some((pattern: string) => pattern.includes('favicon.ico')),
    ).toBe(true)
  })

  it('handles URL with query parameters', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({ status: 200 } as any)

    const mockRequest = new NextRequest('http://localhost:3000/campaigns?page=2&sort=date')

    await middleware(mockRequest)

    expect(vi.mocked(updateSession)).toHaveBeenCalledWith(mockRequest)
  })

  it('handles URL with hash', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({ status: 200 } as any)

    const mockRequest = new NextRequest('http://localhost:3000/create#section')

    await middleware(mockRequest)

    expect(vi.mocked(updateSession)).toHaveBeenCalledWith(mockRequest)
  })
})
