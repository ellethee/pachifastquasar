import { describe, expect, it } from 'vitest'
import {
  packageCodeKey,
  parseApiError,
  parseErrorBody,
  resolveErrorMessage,
} from '../src/helpers/api-error'
import type { IPachiErrorTranslator } from '../src/helpers/api-error'

/** Fake translator: `known` holds the existing keys. */
function fakeTr(known: Record<string, string>): IPachiErrorTranslator {
  return {
    te: (k) => k in known,
    t: (k, p) => (known[k] ?? `?${k}`).replace(/\{(\w+)\}/g, (_m, n: string) => String(p?.[n] ?? '')),
  }
}

const body = { detail: [{ loc: ['body', 'x'], msg: 'Too short', type: 'value_error', code: 'auth.password_too_short', params: { min_length: 12 } }] }

describe('parseErrorBody', () => {
  it('reads detail[]', () => {
    expect(parseErrorBody(body)).toEqual([{ code: 'auth.password_too_short', msg: 'Too short', params: { min_length: 12 }, loc: ['body', 'x'] }])
  })
  it('accepts a string detail and ignores the rest', () => {
    expect(parseErrorBody({ detail: 'boom' })).toEqual([{ msg: 'boom' }])
    expect(parseErrorBody(null)).toEqual([])
    expect(parseErrorBody({ detail: [1, null] })).toEqual([])
    expect(parseErrorBody('x')).toEqual([])
  })
})

describe('parseApiError', () => {
  it('reads a ResponseError (safeResponseJson)', async () => {
    const err = { status: 422, safeResponseJson: async () => body }
    const parsed = await parseApiError(err)
    expect(parsed.status).toBe(422)
    expect(parsed.items[0]?.code).toBe('auth.password_too_short')
  })
  it('reads the fallback client error (body)', async () => {
    expect((await parseApiError({ status: 400, body })).items).toHaveLength(1)
  })
  it('does not throw on odd values or an unreadable body', async () => {
    expect(await parseApiError(null)).toEqual({ status: 0, items: [] })
    expect(await parseApiError(new Error('net'))).toEqual({ status: 0, items: [] })
    const broken = { status: 429, safeResponseJson: async () => { throw new Error('x') } }
    expect(await parseApiError(broken)).toEqual({ status: 429, items: [] })
  })
})

describe('resolveErrorMessage', () => {
  const err = { status: 422, items: parseErrorBody(body) }

  it('prefers the app errors.codes.*', () => {
    const tr = fakeTr({ 'errors.codes.auth.password_too_short': 'App {min_length}', [packageCodeKey('auth.password_too_short')]: 'Pkg' })
    expect(resolveErrorMessage(err, tr)).toBe('App 12')
  })
  it('then the package message', () => {
    const tr = fakeTr({ [packageCodeKey('auth.password_too_short')]: 'Pkg {min_length}' })
    expect(resolveErrorMessage(err, tr)).toBe('Pkg 12')
  })
  it('then the backend msg', () => {
    expect(resolveErrorMessage(err, fakeTr({}))).toBe('Too short')
  })
  it('429 without detail: too many attempts; network; generic', () => {
    const tr = fakeTr({})
    expect(resolveErrorMessage({ status: 429, items: [] }, tr)).toBe('?pachiProfile.security.tooManyRequests')
    expect(resolveErrorMessage({ status: 0, items: [] }, tr)).toBe('?pachiProfile.security.networkError')
    expect(resolveErrorMessage({ status: 500, items: [] }, tr)).toBe('?pachiProfile.security.genericError')
  })
  it('the package key replaces dots', () => {
    expect(packageCodeKey('mfa.too_many_attempts')).toBe('pachiProfile.security.codes.mfa_too_many_attempts')
  })
})
