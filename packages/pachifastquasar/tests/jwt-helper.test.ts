import { describe, expect, it } from 'vitest'
import { decodeJwtExpiry } from 'src/helpers/jwt-helper'

/** Test JWT with base64url payload (no padding, with `-`/`_` when needed). */
function jwt(payload: object): string {
  const b64 = (s: string) => Buffer.from(s).toString('base64url')
  return `${b64('{"alg":"HS256"}')}.${b64(JSON.stringify(payload))}.sig`
}

describe('decodeJwtExpiry', () => {
  it('legge exp in millisecondi', () => {
    expect(decodeJwtExpiry(jwt({ exp: 1900000000 }))).toBe(1900000000000)
  })
  it('handles base64url with - and _ (which atob alone rejects)', () => {
    const token = jwt({ exp: 1900000000, name: 'à?>>>~~~' })
    expect(token.split('.')[1]).toMatch(/[-_]/)
    expect(decodeJwtExpiry(token)).toBe(1900000000000)
  })
  it('missing or malformed token, or without exp -> null', () => {
    for (const t of [undefined, null, '', 'abc', 'a.b.c', jwt({ sub: 'x' }), jwt({ exp: 'domani' })]) {
      expect(decodeJwtExpiry(t)).toBeNull()
    }
  })
})
