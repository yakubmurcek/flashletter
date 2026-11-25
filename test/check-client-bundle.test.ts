// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = join(__dirname, '..', 'scripts', 'check-client-bundle.sh')
const dirs: string[] = []

/** Runs the scan over a fake bundle holding `code`; returns its exit code. */
function scan(code: string): number {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-'))
  dirs.push(dir)
  writeFileSync(join(dir, 'chunk.js'), code)
  try {
    execFileSync('bash', [SCRIPT, dir], { stdio: 'pipe' })
    return 0
  } catch (error) {
    return (error as { status: number }).status
  }
}

// Fakes built at run time so secret scanners do not flag this file.
const pad = 'A1b2C3d4E5f6G7h8'
const serviceRoleJwt = (offset: string) =>
  Buffer.from(`${offset}{"role":"service_role"}`).toString('base64')

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    chmodSync(dir, 0o755)
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('check-client-bundle.sh', () => {
  it('passes a clean bundle', () => {
    expect(scan('const a = "sk_"; export default a')).toBe(0)
  })

  it.each([
    ['Stripe secret key', `${'sk_live_'}${pad}`],
    ['Stripe test key', `${'sk_test_'}${pad}`],
    ['Stripe webhook secret', `${'whsec_'}${pad}`],
    ['Anthropic key', `${'sk-ant-api03-'}${pad}`],
    ['Supabase secret key', `${'sb_secret_'}${pad}`],
    ['service-role JWT, offset 0', serviceRoleJwt('')],
    ['service-role JWT, offset 1', serviceRoleJwt('x')],
    ['service-role JWT, offset 2', serviceRoleJwt('xy')],
    ['private key', `-----BEGIN ${'PRIVATE'} KEY-----`],
    ['e2e fake server secret', `cron-${'e2e0canary0'}xxxx`],
  ])('fails on a leaked %s', (_name, secret) => {
    expect(scan(`const k = "${secret}";`)).toBe(1)
  })

  it('fails, never passes, when it cannot read the bundle', () => {
    if (process.getuid?.() === 0) return // root reads everything
    const dir = mkdtempSync(join(tmpdir(), 'bundle-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'chunk.js'), 'x')
    chmodSync(join(dir, 'chunk.js'), 0o000)
    expect(() => execFileSync('bash', [SCRIPT, dir], { stdio: 'pipe' })).toThrow()
  })
})
