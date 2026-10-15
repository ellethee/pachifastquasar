import { describe, expect, it } from 'vitest'
import { parseApiError, readRetryAfter } from '../src/helpers/api-error'
import { formatCountdown, parseRetryAfter, remainingSeconds } from '../src/helpers/retry-after'

const NOW = Date.parse('Wed, 21 Oct 2026 07:28:00 GMT')

describe('parseRetryAfter', () => {
  it('reads seconds', () => {
    expect(parseRetryAfter('120')).toBe(120)
    expect(parseRetryAfter(' 0 ')).toBe(0)
    expect(parseRetryAfter(45)).toBe(45)
  })
  it('reads an HTTP date relative to now', () => {
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:29:30 GMT', NOW)).toBe(90)
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:27:00 GMT', NOW)).toBe(0)
  })
  it('ignores invalid values', () => {
    for (const v of [undefined, null, '', '  ', '-5', '1.5', 'abc', 'Not, a date', '999999', 1.5, -1, Number.NaN, {}]) {
      expect(parseRetryAfter(v, NOW)).toBeNull()
    }
  })
})

describe('remainingSeconds / formatCountdown', () => {
  it('rounds up and never goes below 0', () => {
    expect(remainingSeconds(10_500, 10_000)).toBe(1)
    expect(remainingSeconds(10_000, 10_000)).toBe(0)
    expect(remainingSeconds(9_000, 10_000)).toBe(0)
  })
  it('formats mm:ss', () => {
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(65)).toBe('01:05')
    expect(formatCountdown(4500)).toBe('75:00')
    expect(formatCountdown(-3)).toBe('00:00')
    expect(formatCountdown(Number.NaN)).toBe('00:00')
  })
})

describe('reading Retry-After from the error', () => {
  it('from response.headers (ResponseError)', async () => {
    const response = new Response('{}', { status: 429, headers: { 'Retry-After': '30' } })
    expect(readRetryAfter({ response })).toBe(30)
    const parsed = await parseApiError({ status: 429, response })
    expect(parsed.retryAfter).toBe(30)
  })
  it('from direct headers and from a plain object', () => {
    expect(readRetryAfter({ headers: new Headers({ 'retry-after': '12' }) })).toBe(12)
    expect(readRetryAfter({ headers: { 'RETRY-AFTER': '7' } })).toBe(7)
  })
  it('missing or invalid header: no retryAfter', async () => {
    expect(readRetryAfter({ response: new Response('', { status: 429 }) })).toBeUndefined()
    expect(readRetryAfter({ headers: { 'Retry-After': 'x' } })).toBeUndefined()
    expect(readRetryAfter({})).toBeUndefined()
    expect('retryAfter' in (await parseApiError({ status: 429 }))).toBe(false)
  })
})
