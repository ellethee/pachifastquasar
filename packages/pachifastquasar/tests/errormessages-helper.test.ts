import { beforeEach, describe, expect, it, vi } from 'vitest'

const te = vi.fn<(key: string) => boolean>()
vi.mock('quasar', () => ({ Dialog: { create: vi.fn() }, Notify: { create: vi.fn() } }))
vi.mock('@ilpachi/pachi-i18n', () => ({
  getPachiI18n: () => ({ global: { te } }),
  pachiT: (key: string, params?: Record<string, unknown>) => `T(${key}${params ? JSON.stringify(params) : ''})`,
}))

const { escapeHtml, translateDetail, formatDetail } = await import('src/helpers/errormessages-helper')

describe('escapeHtml', () => {
  it('escapes special characters', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe(
      '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;',
    )
  })
  it('leaves plain text unchanged', () => {
    expect(escapeHtml('ciao mondo')).toBe('ciao mondo')
  })
})

describe('translateDetail', () => {
  const base = { type: 'x', loc: [], msg: 'fallback', input: '' }
  beforeEach(() => te.mockReset())

  it('uses the translation if it exists', () => {
    te.mockReturnValue(true)
    expect(translateDetail({ ...base, code: 'auth.bad', params: { min_length: 12 } })).toBe(
      'T(errors.codes.auth.bad{"min_length":12})',
    )
  })
  it('falls back to msg if the translation is missing', () => {
    te.mockReturnValue(false)
    expect(translateDetail({ ...base, code: 'auth.bad' })).toBe('fallback')
  })
  it('falls back to msg without code', () => {
    expect(translateDetail(base)).toBe('fallback')
  })
})

describe('formatDetail', () => {
  it('escapes strings', () => {
    expect(formatDetail('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;')
  })
  it('uses the generic message for missing or object detail', () => {
    expect(formatDetail(undefined)).toBe('T(errors.http.generic)')
    expect(formatDetail({ a: 1 })).toBe('T(errors.http.generic)')
    expect(formatDetail('  ')).toBe('T(errors.http.generic)')
  })
  it('builds the list for validation errors', () => {
    te.mockReturnValue(false)
    const html = formatDetail([{ type: 't', loc: ['body', 'x'], msg: '<m>', input: '' }])
    expect(html).toContain('body.x')
    expect(html).toContain('&lt;m&gt;')
    expect(html).not.toContain('tabindex')
  })
})
