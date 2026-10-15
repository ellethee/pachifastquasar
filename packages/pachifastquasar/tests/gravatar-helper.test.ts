import { createHash, randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { gravatarHash, gravatarUrl, initialsOf, sha256Hex } from 'src/helpers/gravatar-helper'

const enc = (text: string) => new TextEncoder().encode(text)

describe('sha256Hex (fallback without crypto.subtle)', () => {
  it('vettori noti', () => {
    expect(sha256Hex(enc(''))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    )
    expect(sha256Hex(enc('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
    expect(sha256Hex(enc('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
    )
  })
  it('matches Node across different lengths (blocks, padding, non-ASCII bytes)', () => {
    for (const n of [0, 1, 55, 56, 63, 64, 65, 119, 120, 1000]) {
      const bytes = new Uint8Array(randomBytes(n))
      expect(sha256Hex(bytes)).toBe(createHash('sha256').update(bytes).digest('hex'))
    }
    expect(sha256Hex(enc('àèìòù@città.it'))).toBe(
      createHash('sha256').update('àèìòù@città.it').digest('hex')
    )
  })
})

describe('gravatarHash', () => {
  afterEach(() => vi.unstubAllGlobals())
  const expected = createHash('sha256').update('mario.rossi@example.com').digest('hex')
  it('normalizes (trim and lowercase) and uses crypto.subtle when available', async () => {
    expect(await gravatarHash('  Mario.Rossi@Example.com ')).toBe(expected)
  })
  it('without crypto.subtle (insecure context) falls back to the JS computation with the same result', async () => {
    vi.stubGlobal('crypto', {})
    expect(await gravatarHash('Mario.Rossi@example.com')).toBe(expected)
  })
  it('email vuota → null', async () => {
    expect(await gravatarHash('   ')).toBeNull()
  })
})

describe('gravatarUrl e initialsOf', () => {
  it('URL with d=404', () => {
    expect(gravatarUrl('abc', 100)).toBe('https://www.gravatar.com/avatar/abc?s=100&d=404')
  })
  it('iniziali', () => {
    expect(initialsOf('Mario Luigi Rossi')).toBe('MR')
    expect(initialsOf('  ')).toBe('')
  })
})
