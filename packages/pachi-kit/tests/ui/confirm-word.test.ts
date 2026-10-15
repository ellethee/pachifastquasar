import { describe, expect, it } from 'vitest'
import { matchesConfirmWord, resolveConfirmWord } from '../../src/ui/helper/confirm-word'

describe('matchesConfirmWord', () => {
  it('confirms only with the exact word', () => {
    expect(matchesConfirmWord('ELIMINA', 'ELIMINA')).toBe(true)
    expect(matchesConfirmWord('elimina', 'ELIMINA')).toBe(false)
    expect(matchesConfirmWord('ELIM', 'ELIMINA')).toBe(false)
  })
  it('ignores surrounding spaces', () => {
    expect(matchesConfirmWord('  ELIMINA ', 'ELIMINA')).toBe(true)
  })
  it('empty word is never valid', () => {
    expect(matchesConfirmWord('', '')).toBe(false)
  })
})

describe('resolveConfirmWord', () => {
  it('uses the custom word if not empty', () => {
    expect(resolveConfirmWord('OK', 'ELIMINA')).toBe('OK')
  })
  it('falls back to the default if missing, empty or only spaces', () => {
    expect(resolveConfirmWord(undefined, 'ELIMINA')).toBe('ELIMINA')
    expect(resolveConfirmWord('', 'ELIMINA')).toBe('ELIMINA')
    expect(resolveConfirmWord('  ', 'ELIMINA')).toBe('ELIMINA')
  })
})
