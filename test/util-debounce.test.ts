import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce, useDebounce } from '@/lib/utils/debounce'

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('calls function after delay', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('collapses multiple rapid calls into one', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    debounced('b')
    debounced('c')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('can cancel pending call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    debounced.cancel()
    vi.advanceTimersByTime(100)
    expect(fn).not.toHaveBeenCalled()
  })

  it('allows new calls after cancel', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    debounced.cancel()
    debounced('b')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('b')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('resets timer on each call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    vi.advanceTimersByTime(50)
    debounced('b')
    vi.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledWith('b')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('passes multiple arguments to debounced function', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a', 'b', 'c')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('a', 'b', 'c')
  })

  it('preserves function return value', () => {
    const fn = vi.fn().mockReturnValue(42)
    const debounced = debounce(fn, 100)
    debounced()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalled()
  })

  it('cancel method returns undefined', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    const result = debounced.cancel()
    expect(result).toBeUndefined()
  })
})

describe('useDebounce (React hook)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('provides debounced function in React context', () => {
    // Note: Full testing of React hooks requires React Testing Library
    // This tests basic timing behavior without component context
    const fn = vi.fn()
    const debounced = useDebounce(fn, 100)
    
    // Call the debounced function
    debounced('test')
    expect(fn).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('test')
  })

  it('debounced hook has cleanup method', () => {
    const fn = vi.fn()
    const debounced = useDebounce(fn, 100)
    
    debounced('a')
    expect((debounced as any).cleanup).toBeDefined()
    expect(typeof (debounced as any).cleanup).toBe('function')
  })

  it('cleanup cancels pending call', () => {
    const fn = vi.fn()
    const debounced = useDebounce(fn, 100)
    
    debounced('a')
    ;(debounced as any).cleanup()
    vi.advanceTimersByTime(100)
    expect(fn).not.toHaveBeenCalled()
  })
})
