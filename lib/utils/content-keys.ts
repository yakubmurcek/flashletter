/**
 * React keys taken from the items themselves, numbering repeats:
 * `['a', 'b', 'a']` -> keys `a`, `b`, `a#2`.
 *
 * Unlike array indexes, a key stays with its item when items are added,
 * removed or moved, so React does not reuse the wrong DOM node.
 */
export function withContentKeys<T extends string>(items: readonly T[]): { key: string; item: T }[] {
  const used = new Set<string>()
  return items.map((item) => {
    let key: string = item
    for (let n = 2; used.has(key); n++) key = `${item}#${n}`
    used.add(key)
    return { key, item }
  })
}
