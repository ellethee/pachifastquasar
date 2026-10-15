import { describe, expect, it } from 'vitest'
import { login, raw } from './helpers'

describe('auth (contract backend-contract.md)', () => {
  it('POST /auth/token: access_token, token_type, refresh_token (no envelope)', async () => {
    const t = await login('admin')
    expect(typeof t.access_token).toBe('string')
    expect(t.token_type.toLowerCase()).toBe('bearer')
    expect(typeof t.refresh_token).toBe('string')
  })

  it('access token JWT con claim exp (the shell renews 60 s before)', async () => {
    const t = await login('admin')
    const payload = JSON.parse(Buffer.from(t.access_token.split('.')[1], 'base64url').toString())
    expect(typeof payload.exp).toBe('number')
    expect(payload.exp * 1000).toBeGreaterThan(Date.now())
  })

  it('wrong credentials: 401 with detail[]', async () => {
    const res = await raw('POST', '/auth/token', { form: { username: 'admin', password: 'x', scope: '', grant_type: 'password' } })
    expect(res.status).toBe(401)
    expect(Array.isArray(res.body.detail)).toBe(true)
  })

  it('rotating refresh: the new refresh replaces the old one, the old one is rejected', async () => {
    const t = await login('admin')
    const r1 = await raw('POST', '/auth/refresh-token', { json: { refresh_token: t.refresh_token } })
    expect(r1.status).toBe(200)
    const n = r1.body.data ?? r1.body
    expect(n.access_token).toBeTruthy()
    expect(n.refresh_token).toBeTruthy()
    expect(n.refresh_token).not.toBe(t.refresh_token)
    const reuse = await raw('POST', '/auth/refresh-token', { json: { refresh_token: t.refresh_token } })
    expect(reuse.status).toBe(401)
    expect(reuse.body.detail[0].code).toBe('auth.refresh_token_revoked')
  })

  it('GET /auth/user with envelope {success,message,data} and permissions[]', async () => {
    const t = await login('admin')
    const res = await raw('GET', '/auth/user', { token: t.access_token })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body).toHaveProperty('message')
    expect(res.body.data.username).toBe('admin')
    expect(Array.isArray(res.body.data.permissions)).toBe(true)
  })

  it('no token: 401', async () => {
    expect((await raw('GET', '/auth/user')).status).toBe(401)
  })

  it('logout with refresh_token: 204 with no body', async () => {
    const t = await login('admin')
    const res = await raw('POST', '/auth/logout', { token: t.access_token, json: { refresh_token: t.refresh_token } })
    expect(res.status).toBe(204)
    expect(res.body).toBeNull()
  })
})
