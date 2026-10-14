import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MIN_PASSWORD_LENGTH,
  isPasswordFormValid,
  minLengthFromError,
  passwordErrorTarget,
  validatePasswordForm,
} from '../src/helpers/password'
import type { IPachiApiError } from '../src/helpers/api-error'

const tooShort = (params: Record<string, unknown>): IPachiApiError => ({
  status: 422,
  items: [{ code: 'auth.password_too_short', params }],
})

describe('validatePasswordForm', () => {
  it('il minimo di default è 12', () => {
    expect(DEFAULT_MIN_PASSWORD_LENGTH).toBe(12)
  })

  it('segnala i campi vuoti', () => {
    expect(validatePasswordForm({ current: '', next: '', confirm: '' }, 12)).toEqual({
      current: 'required',
      next: 'required',
      confirm: 'required',
    })
  })

  it('rispetta la lunghezza minima (12 caratteri ok, 11 no)', () => {
    expect(validatePasswordForm({ current: 'x', next: 'a'.repeat(11), confirm: 'a'.repeat(11) }, 12).next).toBe('tooShort')
    const ok = validatePasswordForm({ current: 'x', next: 'a'.repeat(12), confirm: 'a'.repeat(12) }, 12)
    expect(isPasswordFormValid(ok)).toBe(true)
  })

  it('la conferma deve coincidere', () => {
    const errors = validatePasswordForm({ current: 'x', next: 'a'.repeat(12), confirm: 'b'.repeat(12) }, 12)
    expect(errors).toEqual({ confirm: 'mismatch' })
  })

  it('rivalida con un nuovo minimo', () => {
    const values = { current: 'x', next: 'a'.repeat(12), confirm: 'a'.repeat(12) }
    expect(isPasswordFormValid(validatePasswordForm(values, 12))).toBe(true)
    expect(validatePasswordForm(values, 16).next).toBe('tooShort')
  })
})

describe('minLengthFromError', () => {
  it('aggiorna il minimo da params.min_length', () => {
    expect(minLengthFromError(tooShort({ min_length: 14 }), 12)).toBe(14)
    expect(minLengthFromError(tooShort({ min_length: '10' }), 12)).toBe(10)
  })

  it('ignora valori non validi o altri codici', () => {
    expect(minLengthFromError(tooShort({ min_length: 'x' }), 12)).toBe(12)
    expect(minLengthFromError(tooShort({ min_length: 0 }), 12)).toBe(12)
    expect(minLengthFromError(tooShort({ min_length: 8.5 }), 12)).toBe(12)
    expect(minLengthFromError(tooShort({}), 12)).toBe(12)
    expect(minLengthFromError({ status: 400, items: [{ code: 'auth.password_incorrect', params: { min_length: 3 } }] }, 12)).toBe(12)
  })
})

describe('passwordErrorTarget', () => {
  it('assegna l\'errore al campo giusto', () => {
    expect(passwordErrorTarget({ status: 400, items: [{ code: 'auth.password_incorrect' }] })).toBe('current')
    expect(passwordErrorTarget(tooShort({ min_length: 12 }))).toBe('next')
    expect(passwordErrorTarget({ status: 429, items: [] })).toBe('form')
  })
})
