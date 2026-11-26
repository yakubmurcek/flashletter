// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Old files allowed to break a Biome rule (README "Quality baseline"). The lists only
// shrink: lower this number when you fix a file, never raise it.
const MAX_BASELINE_ENTRIES = 60

const root = join(__dirname, '..')
const config = JSON.parse(readFileSync(join(root, 'biome.json'), 'utf8')) as {
  overrides?: { includes: string[] }[]
}
const entries = (config.overrides ?? []).flatMap((o) => o.includes)

describe('Biome baseline', () => {
  it('never grows', () => {
    expect(entries.length).toBeLessThanOrEqual(MAX_BASELINE_ENTRIES)
  })

  it('lists only files that exist (fixed or deleted ones come off)', () => {
    expect(entries.filter((f) => !existsSync(join(root, f)))).toEqual([])
  })
})
