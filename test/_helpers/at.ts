/**
 * Test helper: the element at `index` of a list (negative counts from the end).
 *
 * Why: with `noUncheckedIndexedAccess` a list read can be `undefined`. This
 * throws when the element is missing, so the test fails at the read with a
 * clear message instead of asserting on `undefined` (which can make a
 * negative assertion like `toBeUndefined` pass by accident).
 */
export function at<T>(list: ArrayLike<T>, index: number): T {
  const value = Array.from(list).at(index)
  if (value === undefined) {
    throw new Error(`Expected an element at index ${index}, the list has ${list.length}`)
  }
  return value
}
