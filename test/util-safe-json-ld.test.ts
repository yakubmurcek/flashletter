import { describe, it, expect } from 'vitest'
import { safeJsonLd } from '../lib/utils'

describe('safeJsonLd', () => {
  it('should stringify a simple object', () => {
    const data = { name: 'Flashletter' }
    expect(safeJsonLd(data)).toBe('{"name":"Flashletter"}')
  })

  it('should escape < characters to prevent </script> injection', () => {
    const data = { content: '</script><script>alert("xss")</script>' }
    const result = safeJsonLd(data)
    expect(result).not.toContain('<')
    expect(result).toContain('\\u003c')
    expect(result).toBe(
      '{"content":"\\u003c/script>\\u003cscript>alert(\\"xss\\")\\u003c/script>"}',
    )
  })

  it('should handle nested objects', () => {
    const data = { nested: { key: '<value>' } }
    expect(safeJsonLd(data)).toBe('{"nested":{"key":"\\u003cvalue>"}}')
  })
})
