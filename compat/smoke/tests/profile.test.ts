import { beforeAll, describe, expect, it } from 'vitest'
import { PASSWORD, login, raw } from './helpers'

let token = ''

/** First `code` of the backend `detail[]` errors (or `undefined`). */
function firstCode(body: any): string | undefined {
  return body?.detail?.[0]?.code
}

describe('user profile: PATCH /auth/user and password change', () => {
  beforeAll(async () => {
    token = (await login('admin')).access_token
  })

  it('PATCH /auth/user: updates a field and returns it in the envelope', async () => {
    const res = await raw('PATCH', '/auth/user', { token, json: { firstName: 'Ada' } })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toMatchObject({ username: 'admin', firstName: 'Ada' })
    const me = (await raw('GET', '/auth/user', { token })).body.data
    expect(me.firstName).toBe('Ada')
    await raw('PATCH', '/auth/user', { token, json: { firstName: '' } })
  })

  it('PATCH /auth/user: invalid email -> 422 con loc body.email', async () => {
    const res = await raw('PATCH', '/auth/user', { token, json: { email: 'not-an-email' } })
    expect(res.status).toBe(422)
    expect(res.body.detail[0].loc).toEqual(['body', 'email'])
  })

  it('PATCH /auth/user: field too long -> 422', async () => {
    const res = await raw('PATCH', '/auth/user', { token, json: { firstName: 'a'.repeat(151) } })
    expect(res.status).toBe(422)
    expect(res.body.detail[0].loc).toEqual(['body', 'firstName'])
  })

  it('PATCH /auth/user: changing email without currentPassword -> 400 auth.password_incorrect', async () => {
    const res = await raw('PATCH', '/auth/user', { token, json: { email: 'new@example.com' } })
    expect(res.status).toBe(400)
    expect(firstCode(res.body)).toBe('auth.password_incorrect')
  })

  it('PATCH /auth/user: email already in use -> 400 user.email_exists', async () => {
    const res = await raw('PATCH', '/auth/user', {
      token,
      json: { email: 'limited@example.com', currentPassword: PASSWORD },
    })
    expect(res.status).toBe(400)
    expect(res.body.detail[0].loc).toEqual(['body', 'email'])
    expect(firstCode(res.body)).toBe('user.email_exists')
  })

  it('POST /auth/user/password: same password -> 422 auth.password_unchanged', async () => {
    const res = await raw('POST', '/auth/user/password', {
      token,
      json: { currentPassword: PASSWORD, newPassword: PASSWORD },
    })
    expect(res.status).toBe(422)
    expect(res.body.detail[0].loc).toEqual(['body', 'newPassword'])
    expect(firstCode(res.body)).toBe('auth.password_unchanged')
  })

  it('POST /auth/user/password: wrong current password -> 400 auth.password_incorrect', async () => {
    const res = await raw('POST', '/auth/user/password', {
      token,
      json: { currentPassword: 'wrong', newPassword: 'Altra-Password-9876!' },
    })
    expect(res.status).toBe(400)
    expect(firstCode(res.body)).toBe('auth.password_incorrect')
  })
})

describe('GET /admin/user: default pagination (pachifast >= 0.15)', () => {
  it('no parameters: page 1, pageSize 25, consistent total and pages', async () => {
    const res = await raw('GET', '/admin/user', { token })
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(d).toMatchObject({ page: 1, pageSize: 25 })
    expect(d.total).toBeGreaterThanOrEqual(2)
    expect(d.items.length).toBeLessThanOrEqual(25)
    expect(d.pages).toBe(Math.ceil(d.total / 25))
  })

  it('page/pageSize explicit (like fastquasar-admin) are honored', async () => {
    const d = (await raw('GET', '/admin/user?page=2&pageSize=1&orderBy=username', { token })).body.data
    expect(d).toMatchObject({ page: 2, pageSize: 1 })
    expect(d.items).toHaveLength(1)
  })
})
