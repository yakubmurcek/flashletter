// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const config = readFileSync(join(__dirname, '..', '.github', 'dependabot.yml'), 'utf8')

describe('dependabot.yml', () => {
  // main is the only long-lived branch; pointing at another one (the old dev) silently
  // stopped every dependency update.
  it('opens update PRs against main', () => {
    const targets = [...config.matchAll(/^\s*target-branch:\s*(\S+)/gm)].map((m) => m[1])
    expect(targets.filter((t) => t !== 'main')).toEqual([])
  })

  // The "PR title" check requires "type(scope): summary"; Dependabot's default "Bump ..." fails it.
  it('gives every update a title the PR title check accepts', () => {
    const ecosystems = config.match(/package-ecosystem:/g)?.length ?? 0
    const prefixes = config.match(/^\s*prefix:\s*(build|ci|chore)\s*$/gm)?.length ?? 0
    expect(prefixes).toBe(ecosystems)
  })
})
