import { beforeEach, describe, expect, it, vi } from 'vitest'

const te = vi.fn<(key: string) => boolean>()
vi.mock('quasar', () => ({ Dialog: { create: vi.fn() }, Notify: { create: vi.fn() } }))
vi.mock('@ilpachi/pachi-i18n', () => ({
  getPachiI18n: () => ({ global: { te } }),
  pachiT: (key: string, params?: Record<string, unknown>) => `T(${key}${params ? JSON.stringify(params) : ''})`,
}))

const { escapeHtml, translateDetail, formatDetail } = await import('src/helpers/errormessages-helper')

describe('escapeHtml', () => {
  it('esegue l\'escape dei caratteri speciali', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe(
      '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;',
    )
  })
  it('lascia invariato il testo semplice', () => {
    expect(escapeHtml('ciao mondo')).toBe('ciao mondo')
  })
})

describe('translateDetail', () => {
  const base = { type: 'x', loc: [], msg: 'fallback', input: '' }
  beforeEach(() => te.mockReset())

  it('usa la traduzione se esiste', () => {
    te.mockReturnValue(true)
    expect(translateDetail({ ...base, code: 'auth.bad', params: { min_length: 12 } })).toBe(
      'T(errors.codes.auth.bad{"min_length":12})',
    )
  })
  it('ripiega su msg se manca la traduzione', () => {
    te.mockReturnValue(false)
    expect(translateDetail({ ...base, code: 'auth.bad' })).toBe('fallback')
  })
  it('ripiega su msg senza code', () => {
    expect(translateDetail(base)).toBe('fallback')
  })
})

describe('formatDetail', () => {
  it('fa l\'escape delle stringhe', () => {
    expect(formatDetail('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;')
  })
  it('usa il messaggio generico per detail assente o oggetto', () => {
    expect(formatDetail(undefined)).toBe('T(errors.http.generic)')
    expect(formatDetail({ a: 1 })).toBe('T(errors.http.generic)')
    expect(formatDetail('  ')).toBe('T(errors.http.generic)')
  })
  it('costruisce la lista per gli errori di validazione', () => {
    te.mockReturnValue(false)
    const html = formatDetail([{ type: 't', loc: ['body', 'x'], msg: '<m>', input: '' }])
    expect(html).toContain('body.x')
    expect(html).toContain('&lt;m&gt;')
    expect(html).not.toContain('tabindex')
  })
})
