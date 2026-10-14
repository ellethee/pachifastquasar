import { describe, expect, it } from 'vitest'
import { parseApiError } from '../src/helpers/api-error'
import { SEND_COOLDOWN_SECONDS, isSendRateLimited, sendCooldownSeconds } from '../src/helpers/cooldown'

const limited = { code: 'auth.rate_limited' }

describe('isSendRateLimited', () => {
  it('riconosce il 429 auth.rate_limited e il 429 senza codice', () => {
    expect(isSendRateLimited({ status: 429, items: [limited] })).toBe(true)
    expect(isSendRateLimited({ status: 429, items: [] })).toBe(true)
  })
  it('esclude il blocco per troppi tentativi e gli altri stati', () => {
    expect(isSendRateLimited({ status: 429, items: [{ code: 'mfa.too_many_attempts' }] })).toBe(false)
    expect(isSendRateLimited({ status: 400, items: [limited] })).toBe(false)
    expect(isSendRateLimited({ status: 0, items: [] })).toBe(false)
  })
})

describe('sendCooldownSeconds', () => {
  it('usa Retry-After se presente', () => {
    expect(sendCooldownSeconds({ status: 429, items: [limited], retryAfter: 12 })).toBe(12)
  })
  it('ripiega su 30 s se manca o vale 0', () => {
    expect(sendCooldownSeconds({ status: 429, items: [limited] })).toBe(SEND_COOLDOWN_SECONDS)
    expect(sendCooldownSeconds({ status: 429, items: [limited], retryAfter: 0 })).toBe(30)
  })
  it('legge Retry-After da un errore del client', async () => {
    const err = { status: 429, response: { headers: new Headers({ 'Retry-After': '17' }) }, body: { detail: [limited] } }
    const parsed = await parseApiError(err)
    expect(isSendRateLimited(parsed)).toBe(true)
    expect(sendCooldownSeconds(parsed)).toBe(17)
  })
  it('senza header espone il ripiego', async () => {
    const parsed = await parseApiError({ status: 429, body: { detail: [limited] } })
    expect(sendCooldownSeconds(parsed)).toBe(30)
  })
})
