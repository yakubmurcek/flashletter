/**
 * Test helper: the value, or a clear failure if it is missing.
 *
 * Use instead of the `!` non-null assertion: when the value is absent the test
 * fails with "Expected <what> to exist" here, not with a TypeError further on.
 */
export function must<T>(value: T | null | undefined, what = 'value'): T {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${what} to exist`)
  }
  return value
}
