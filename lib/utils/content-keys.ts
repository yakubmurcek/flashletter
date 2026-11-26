/**
 * React keys taken from the items themselves, numbering repeats:
 * `['a', 'b', 'a']` -> keys `a`, `b`, `a#2`.
 *
 * Unlike array indexes, a key stays with its item when items are added,
 * removed or moved, so React does not reuse the wrong DOM node.
 */
export function withContentKeys<T extends string>(items: readonly T[]): { key: string; item: T }[] {
  const seen = new Map<string, number>()
  return items.map((item) => {
    const n = (seen.get(item) ?? 0) + 1
    seen.set(item, n)
    return { key: n === 1 ? item : `${item}#${n}`, item }
  })
}
