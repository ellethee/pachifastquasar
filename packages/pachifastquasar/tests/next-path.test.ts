import { describe, expect, it } from 'vitest'
import { safeNextPath } from 'src/helpers/next-path'

describe('safeNextPath', () => {
  it('accetta percorsi interni', () => {
    expect(safeNextPath('/a/b?x=1#h', '/')).toBe('/a/b?x=1#h')
  })
  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/x://y', '', 'a/b', '/a\nb'])(
    'rifiuta %j',
    (v) => {
      expect(safeNextPath(v, '/home')).toBe('/home')
    },
  )
  it('rifiuta i valori non stringa', () => {
    expect(safeNextPath(undefined, '/')).toBe('/')
    expect(safeNextPath(['/a'], '/')).toBe('/')
    expect(safeNextPath(null, '/')).toBe('/')
  })
})
