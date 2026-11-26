import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  logError,
  getUserFriendlyMessage,
  withErrorHandling,
  withErrorLogging,
  handleComponentError,
  type ErrorContext,
} from '@/lib/utils/error-handling'

describe('logError', () => {
  beforeEach(() => {
    // Source only logs when NODE_ENV === 'development'
    vi.stubEnv('NODE_ENV', 'development')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('logs Error objects with context', () => {
    const error = new Error('test error')
    const context: ErrorContext = { operation: 'testOp', component: 'TestComp' }
    logError(error, context)
    expect(console.error).toHaveBeenCalled()
  })

  it('logs non-Error values', () => {
    const context: ErrorContext = { operation: 'testOp' }
    logError('string error', context)
    expect(console.error).toHaveBeenCalled()
  })

  it('includes timestamp in logged data', () => {
    const error = new Error('test')
    const context: ErrorContext = { operation: 'op' }
    logError(error, context)
    const call = vi.mocked(console.error).mock.calls[0][1]
    expect(call).toHaveProperty('timestamp')
  })

  it('includes operation from context', () => {
    const error = new Error('test')
    const context: ErrorContext = { operation: 'myOp' }
    logError(error, context)
    const call = vi.mocked(console.error).mock.calls[0][1]
    expect(call.operation).toBe('myOp')
  })

  it('includes custom timestamp if provided', () => {
    const error = new Error('test')
    const customTime = '2024-01-01T00:00:00Z'
    const context: ErrorContext = { operation: 'op', timestamp: customTime }
    logError(error, context)
    const call = vi.mocked(console.error).mock.calls[0][1]
    expect(call.timestamp).toBe(customTime)
  })

  it('includes additional data from context', () => {
    const error = new Error('test')
    const context: ErrorContext = {
      operation: 'op',
      additionalData: { userId: '123', campaignId: '456' },
    }
    logError(error, context)
    const call = vi.mocked(console.error).mock.calls[0][1]
    expect(call.additionalData).toEqual({ userId: '123', campaignId: '456' })
  })

  it('handles Error stack trace', () => {
    const error = new Error('test error')
    const context: ErrorContext = { operation: 'op' }
    logError(error, context)
    const call = vi.mocked(console.error).mock.calls[0][1]
    expect(call.stack).toBeDefined()
  })
})

describe('getUserFriendlyMessage', () => {
  it('returns cancelled message for AbortError', () => {
    const err = new Error('cancelled')
    err.name = 'AbortError'
    const result = getUserFriendlyMessage(err, 'foo')
    expect(result).toBe('Operation was cancelled')
  })

  it('returns network message for fetch failures', () => {
    const result = getUserFriendlyMessage(new Error('Failed to fetch'), 'scrape')
    expect(result).toMatch(/network error/i)
  })

  it('returns config message for API key errors', () => {
    const result = getUserFriendlyMessage(new Error('Invalid API key'), 'foo')
    expect(result).toMatch(/configuration/i)
  })

  it('returns permission message for permission errors', () => {
    const result = getUserFriendlyMessage(new Error('permission denied'), 'foo')
    expect(result).toMatch(/permission/i)
  })

  it('returns permission message for unauthorized errors', () => {
    const result = getUserFriendlyMessage(new Error('unauthorized'), 'foo')
    expect(result).toMatch(/permission/i)
  })

  it('returns generic fallback for other errors (no error.message leak)', () => {
    // Source intentionally does NOT echo error.message in the catch-all so DB
    // / library internals never reach the UI.
    const result = getUserFriendlyMessage(new Error('specific failure'), 'foo')
    expect(result).toBe('Failed to foo. Please try again.')
  })

  it('returns fallback message for non-Error values', () => {
    const result = getUserFriendlyMessage('error string', 'generate')
    expect(result).toMatch(/failed to generate/i)
  })

  it('returns fallback message for null', () => {
    const result = getUserFriendlyMessage(null, 'send')
    expect(result).toMatch(/failed to send/i)
  })

  it('returns fallback message for objects without Error interface', () => {
    const result = getUserFriendlyMessage({ msg: 'error' }, 'delete')
    expect(result).toMatch(/failed to delete/i)
  })
})

describe('withErrorHandling', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns result on success', async () => {
    const result = await withErrorHandling(async () => 42, { operation: 'test' })
    expect(result).toBe(42)
  })

  it('returns null and swallows error', async () => {
    const result = await withErrorHandling(
      async () => {
        throw new Error('boom')
      },
      { operation: 'test' },
    )
    expect(result).toBeNull()
  })

  it('logs the error', async () => {
    await withErrorHandling(
      async () => {
        throw new Error('test error')
      },
      { operation: 'test' },
    )
    expect(console.error).toHaveBeenCalled()
  })

  it('works with async operations', async () => {
    let executed = false
    const result = await withErrorHandling(
      async () => {
        executed = true
        return 'success'
      },
      { operation: 'test' },
    )
    expect(executed).toBe(true)
    expect(result).toBe('success')
  })
})

describe('withErrorLogging', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns result on success', async () => {
    const result = await withErrorLogging(async () => 42, { operation: 'test' })
    expect(result).toBe(42)
  })

  it('logs error but still throws', async () => {
    const error = new Error('boom')
    const promise = withErrorLogging(
      async () => {
        throw error
      },
      { operation: 'test' },
    )

    expect(console.error).not.toHaveBeenCalled() // Not yet, called after error

    await expect(promise).rejects.toBe(error)
    expect(console.error).toHaveBeenCalled()
  })

  it('preserves error stack', async () => {
    const error = new Error('test error')
    const originalStack = error.stack

    const promise = withErrorLogging(
      async () => {
        throw error
      },
      { operation: 'test' },
    )

    try {
      await promise
    } catch (e: unknown) {
      expect((e as Error).stack).toBe(originalStack)
    }
  })
})

describe('handleComponentError', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('logs error with component context', () => {
    const error = new Error('render failed')
    handleComponentError(error, 'EmailEditor', 'render')
    expect(console.error).toHaveBeenCalled()
  })

  it('returns user-friendly message', () => {
    const error = new Error('Failed to fetch')
    const result = handleComponentError(error, 'DataLoader', 'fetch')
    expect(result).toMatch(/network error/i)
  })

  it('includes component in logged context', () => {
    const error = new Error('test')
    handleComponentError(error, 'MyComponent', 'operation')
    const call = vi.mocked(console.error).mock.calls[0][1]
    expect(call.component).toBe('MyComponent')
  })

  it('includes additional data if provided', () => {
    const error = new Error('test')
    handleComponentError(error, 'Editor', 'save', { emailId: 5 })
    const call = vi.mocked(console.error).mock.calls[0][1]
    expect(call.additionalData).toEqual({ emailId: 5 })
  })

  it('works without additional data', () => {
    const error = new Error('test')
    const result = handleComponentError(error, 'Component', 'action')
    expect(typeof result).toBe('string')
  })
})
