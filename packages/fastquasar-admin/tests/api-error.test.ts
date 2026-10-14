import { describe, expect, it } from 'vitest'
import { camelize, describeError, errorKind, itemField, packageCodeKey, parseApiError, parseErrorBody } from '../src/helpers/api-error'

const tr = (keys: Record<string, string> = {}) => ({
  te: (k: string) => k in keys,
  t: (k: string, p?: Record<string, unknown>) => (keys[k] ?? k).replace(/\{(\w+)\}/g, (_m, n: string) => String(p?.[n])),
})

describe('api-error', () => {
  it('parseErrorBody', () => {
    expect(parseErrorBody({ detail: 'x' })).toEqual([{ msg: 'x' }])
    expect(parseErrorBody({ detail: [{ code: 'c', msg: 'm', loc: ['body', 'a'], params: { p: 1 } }, 3] })).toEqual([
      { code: 'c', msg: 'm', loc: ['body', 'a'], params: { p: 1 } },
    ])
    expect(parseErrorBody(null)).toEqual([])
  })

  it('parseApiError legge il corpo dal client alova o di ripiego', async () => {
    const alova = await parseApiError({ status: 422, safeResponseJson: async () => ({ detail: [{ msg: 'a' }] }) })
    expect(alova).toEqual({ status: 422, items: [{ msg: 'a' }] })
    expect(await parseApiError({ status: 409, body: { detail: 'x' } })).toEqual({ status: 409, items: [{ msg: 'x' }] })
    expect(await parseApiError(new Error('rete'))).toEqual({ status: 0, items: [] })
  })

  it('famiglie', () => {
    expect([422, 409, 403, 404, 401, 0, 500].map(errorKind)).toEqual([
      'validation', 'conflict', 'forbidden', 'notFound', 'unauthorized', 'network', 'other',
    ])
  })

  it('422: errore sul campo (anche snake_case)', () => {
    const d = describeError(
      { status: 422, items: [{ msg: 'Obbligatorio', loc: ['body', 'name'] }, { msg: 'Troppo corto', loc: ['body', 'country_id'] }] },
      tr()
    )
    expect(d.kind).toBe('validation')
    expect(d.fields).toEqual({ name: 'Obbligatorio', countryId: 'Troppo corto' })
    expect(d.message).toBe('pachiAdmin.errors.validation')
    expect(itemField({ loc: ['header', 'x'] })).toBeUndefined()
    expect(camelize('a_b_c')).toBe('aBC')
  })

  it('403: permessi mancanti con parametri uniti', () => {
    const key = packageCodeKey('access.permissions_missing')
    expect(key).toBe('pachiAdmin.errors.codes.access_permissions_missing')
    const d = describeError(
      { status: 403, items: [{ code: 'access.permissions_missing', params: { permissions: ['demo.item.add', 'x'] } }] },
      tr({ [key]: 'Mancano: {permissions}' })
    )
    expect(d.kind).toBe('forbidden')
    expect(d.message).toBe('Mancano: demo.item.add, x')
  })

  it('409: usa la traduzione dell\'app prima di quella del package', () => {
    const d = describeError(
      { status: 409, items: [{ code: 'admin.integrity_error', msg: 'be' }] },
      tr({ 'errors.codes.admin.integrity_error': 'App', [packageCodeKey('admin.integrity_error')]: 'Pkg' })
    )
    expect(d).toMatchObject({ kind: 'conflict', message: 'App' })
  })

  it('senza corpo usa il messaggio della famiglia', () => {
    expect(describeError({ status: 404, items: [] }, tr()).message).toBe('pachiAdmin.errors.notFound')
    expect(describeError({ status: 0, items: [] }, tr()).message).toBe('pachiAdmin.errors.network')
  })
})
