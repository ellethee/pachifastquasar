import { describe, expect, it } from 'vitest'
import { matchesConfirmWord, resolveConfirmWord } from '../../src/ui/helper/confirm-word'

describe('matchesConfirmWord', () => {
  it('conferma solo con la parola esatta', () => {
    expect(matchesConfirmWord('ELIMINA', 'ELIMINA')).toBe(true)
    expect(matchesConfirmWord('elimina', 'ELIMINA')).toBe(false)
    expect(matchesConfirmWord('ELIM', 'ELIMINA')).toBe(false)
  })
  it('ignora gli spazi ai bordi', () => {
    expect(matchesConfirmWord('  ELIMINA ', 'ELIMINA')).toBe(true)
  })
  it('parola vuota mai valida', () => {
    expect(matchesConfirmWord('', '')).toBe(false)
  })
})

describe('resolveConfirmWord', () => {
  it('usa la parola personalizzata se non vuota', () => {
    expect(resolveConfirmWord('OK', 'ELIMINA')).toBe('OK')
  })
  it('ripiega sul default se assente, vuota o di soli spazi', () => {
    expect(resolveConfirmWord(undefined, 'ELIMINA')).toBe('ELIMINA')
    expect(resolveConfirmWord('', 'ELIMINA')).toBe('ELIMINA')
    expect(resolveConfirmWord('  ', 'ELIMINA')).toBe('ELIMINA')
  })
})
