import { describe, expect, it } from 'vitest'
import { login, raw } from './helpers'

describe('auth (contratto backend-contract.md)', () => {
  it('POST /auth/token: access_token, token_type, refresh_token (senza envelope)', async () => {
    const t = await login('admin')
    expect(typeof t.access_token).toBe('string')
    expect(t.token_type.toLowerCase()).toBe('bearer')
    expect(typeof t.refresh_token).toBe('string')
  })

  it('access token JWT con claim exp (la shell rinnova 60 s prima)', async () => {
    const t = await login('admin')
    const payload = JSON.parse(Buffer.from(t.access_token.split('.')[1], 'base64url').toString())
    expect(typeof payload.exp).toBe('number')
    expect(payload.exp * 1000).toBeGreaterThan(Date.now())
  })

  it('credenziali errate: 401 con detail[]', async () => {
    const res = await raw('POST', '/auth/token', { form: { username: 'admin', password: 'x', scope: '', grant_type: 'password' } })
    expect(res.status).toBe(401)
    expect(Array.isArray(res.body.detail)).toBe(true)
  })

  it('refresh rotante: il nuovo refresh sostituisce il vecchio, il vecchio e\' rifiutato', async () => {
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

  it('GET /auth/user con envelope {success,message,data} e permissions[]', async () => {
    const t = await login('admin')
    const res = await raw('GET', '/auth/user', { token: t.access_token })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body).toHaveProperty('message')
    expect(res.body.data.username).toBe('admin')
    expect(Array.isArray(res.body.data.permissions)).toBe(true)
  })

  it('senza token: 401', async () => {
    expect((await raw('GET', '/auth/user')).status).toBe(401)
  })

  it('logout con refresh_token: 204 senza corpo', async () => {
    const t = await login('admin')
    const res = await raw('POST', '/auth/logout', { token: t.access_token, json: { refresh_token: t.refresh_token } })
    expect(res.status).toBe(204)
    expect(res.body).toBeNull()
  })
})
