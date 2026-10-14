import { describe, expect, it } from 'vitest'
import { formatCountdown, parseRetryAfter, retryAfterFromError } from '../src/helpers/retry-after'

describe('parseRetryAfter', () => {
  it('legge i secondi', () => {
    expect(parseRetryAfter('120')).toBe(120)
    expect(parseRetryAfter(' 0 ')).toBe(0)
  })
  it('legge una data HTTP rispetto a now', () => {
    const now = Date.parse('Wed, 21 Oct 2026 07:00:00 GMT')
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:01:30 GMT', now)).toBe(90)
    expect(parseRetryAfter('Wed, 21 Oct 2026 06:00:00 GMT', now)).toBe(0)
  })
  it('ignora i valori non validi', () => {
    for (const v of [undefined, null, 5, '', '  ', '-5', '1.5', 'abc', '12abc', '1e3']) {
      expect(parseRetryAfter(v)).toBeNull()
    }
  })
})

describe('retryAfterFromError', () => {
  it('legge l\'header dalla response', () => {
    const error = { status: 429, response: { headers: new Headers({ 'Retry-After': '45' }) } }
    expect(retryAfterFromError(error)).toBe(45)
  })
  it('null senza header o senza response', () => {
    expect(retryAfterFromError({ response: { headers: new Headers() } })).toBeNull()
    expect(retryAfterFromError(new Error('x'))).toBeNull()
    expect(retryAfterFromError(null)).toBeNull()
  })
})

describe('formatCountdown', () => {
  it('formatta mm:ss', () => {
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(65)).toBe('01:05')
    expect(formatCountdown(3725)).toBe('62:05')
    expect(formatCountdown(-3)).toBe('00:00')
    expect(formatCountdown(Number.NaN)).toBe('00:00')
  })
})
