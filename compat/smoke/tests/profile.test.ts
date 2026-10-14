import { beforeAll, describe, expect, it } from 'vitest'
import { PASSWORD, login, raw } from './helpers'

let token = ''

/** Primo `code` degli errori `detail[]` del backend (o `undefined`). */
function firstCode(body: any): string | undefined {
  return body?.detail?.[0]?.code
}

describe('profilo utente: PATCH /auth/user e cambio password', () => {
  beforeAll(async () => {
    token = (await login('admin')).access_token
  })

  it('PATCH /auth/user: modifica un campo e lo restituisce nell\'envelope', async () => {
    const res = await raw('PATCH', '/auth/user', { token, json: { firstName: 'Ada' } })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toMatchObject({ username: 'admin', firstName: 'Ada' })
    const me = (await raw('GET', '/auth/user', { token })).body.data
    expect(me.firstName).toBe('Ada')
    await raw('PATCH', '/auth/user', { token, json: { firstName: '' } })
  })

  it('PATCH /auth/user: email non valida -> 422 con loc body.email', async () => {
    const res = await raw('PATCH', '/auth/user', { token, json: { email: 'non-una-email' } })
    expect(res.status).toBe(422)
    expect(res.body.detail[0].loc).toEqual(['body', 'email'])
  })

  it('PATCH /auth/user: campo troppo lungo -> 422', async () => {
    const res = await raw('PATCH', '/auth/user', { token, json: { firstName: 'a'.repeat(151) } })
    expect(res.status).toBe(422)
    expect(res.body.detail[0].loc).toEqual(['body', 'firstName'])
  })

  it('PATCH /auth/user: cambiare email senza currentPassword -> 400 auth.password_incorrect', async () => {
    const res = await raw('PATCH', '/auth/user', { token, json: { email: 'nuova@example.com' } })
    expect(res.status).toBe(400)
    expect(firstCode(res.body)).toBe('auth.password_incorrect')
  })

  it('PATCH /auth/user: email gia\' usata -> 400 user.email_exists', async () => {
    const res = await raw('PATCH', '/auth/user', {
      token,
      json: { email: 'limited@example.com', currentPassword: PASSWORD },
    })
    expect(res.status).toBe(400)
    expect(res.body.detail[0].loc).toEqual(['body', 'email'])
    expect(firstCode(res.body)).toBe('user.email_exists')
  })

  it('POST /auth/user/password: stessa password -> 422 auth.password_unchanged', async () => {
    const res = await raw('POST', '/auth/user/password', {
      token,
      json: { currentPassword: PASSWORD, newPassword: PASSWORD },
    })
    expect(res.status).toBe(422)
    expect(res.body.detail[0].loc).toEqual(['body', 'newPassword'])
    expect(firstCode(res.body)).toBe('auth.password_unchanged')
  })

  it('POST /auth/user/password: password attuale errata -> 400 auth.password_incorrect', async () => {
    const res = await raw('POST', '/auth/user/password', {
      token,
      json: { currentPassword: 'sbagliata', newPassword: 'Altra-Password-9876!' },
    })
    expect(res.status).toBe(400)
    expect(firstCode(res.body)).toBe('auth.password_incorrect')
  })
})

describe('GET /admin/user: paginazione di default (pachifast >= 0.15)', () => {
  it('senza parametri: pagina 1, pageSize 25, total e pages coerenti', async () => {
    const res = await raw('GET', '/admin/user', { token })
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(d).toMatchObject({ page: 1, pageSize: 25 })
    expect(d.total).toBeGreaterThanOrEqual(2)
    expect(d.items.length).toBeLessThanOrEqual(25)
    expect(d.pages).toBe(Math.ceil(d.total / 25))
  })

  it('page/pageSize espliciti (come fastquasar-admin) sono rispettati', async () => {
    const d = (await raw('GET', '/admin/user?page=2&pageSize=1&orderBy=username', { token })).body.data
    expect(d).toMatchObject({ page: 2, pageSize: 1 })
    expect(d.items).toHaveLength(1)
  })
})
