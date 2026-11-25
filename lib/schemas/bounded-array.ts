import { z } from 'zod'

/**
 * An array schema that rejects an oversized array before validating any element.
 *
 * Zod 3 validates every element even when `.max()` already failed, and keeps
 * one issue object per bad element: a 4 MB body of 2 million wrong-typed items
 * costs ~700 MB of heap (GHSA-mrhx-c7xc-m3w5). The length guard runs first, so
 * an oversized array fails with a single issue and its elements are never read.
 * Use it for every array that comes from a request body.
 */
export function boundedArray<T extends z.ZodTypeAny>(item: T, max: number) {
  return z
    .custom<unknown[]>((value) => Array.isArray(value) && value.length <= max, {
      message: `Required: an array of at most ${max} items`,
    })
    .pipe(z.array(item))
}
