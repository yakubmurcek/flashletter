import { describe, expect, it } from 'vitest'
import { withContentKeys } from '@/lib/utils/content-keys'

describe('withContentKeys', () => {
  it('keys each item by its text and numbers repeats', () => {
    expect(withContentKeys(['a', 'b', 'a', 'a'])).toEqual([
      { key: 'a', item: 'a' },
      { key: 'b', item: 'b' },
      { key: 'a#2', item: 'a' },
      { key: 'a#3', item: 'a' },
    ])
  })

  it('keeps a key with its item when an earlier item is removed', () => {
    const before = withContentKeys(['x', 'y', 'z'])
    const after = withContentKeys(['y', 'z'])
    expect(after.map((k) => k.key)).toEqual(before.slice(1).map((k) => k.key))
  })

  it('never repeats a key, even when an item looks like a numbered repeat', () => {
    for (const items of [
      ['a#2', 'a', 'a'],
      ['a', 'a', 'a#2'],
    ]) {
      const keys = withContentKeys(items).map((k) => k.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('returns an empty list for no items', () => {
    expect(withContentKeys([])).toEqual([])
  })
})
