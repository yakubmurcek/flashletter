import { vi } from 'vitest'

/**
 * Test helper: make a mocked function (from `vi.mock`) return a test double that
 * fills in only the fields the test reads.
 *
 * Unlike `as any`, the keys and value types are still checked against what `fn`
 * really returns, so a typo or a wrong type fails `tsc`.
 */
export function mockReturnPartial<F extends (...args: never[]) => unknown>(
  fn: F,
  value: Partial<ReturnType<F>>,
): void {
  vi.mocked(fn).mockReturnValue(value as ReturnType<F>)
}
