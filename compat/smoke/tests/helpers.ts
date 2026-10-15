import { createUseAlova } from '@ilpachi/use-alova'

/** Base URL of the test backend (`COMPAT_PORT`, default 8030). */
export const ORIGIN = `http://127.0.0.1:${process.env.COMPAT_PORT ?? '8030'}`
/** Password of the test users: `COMPAT_PASSWORD` (as in compat/backend.sh); throwaway local credential, not a secret. */
export const PASSWORD = process.env.COMPAT_PASSWORD ?? 'Compat-Test-1234!'

/** Token pair returned by `POST /api/auth/token`. */
export interface Tokens {
  access_token: string
  token_type: string
  refresh_token: string
}

/**
 * Raw HTTP call (fetch) with the documented contract, for checks on the exact response format.
 *
 * @param method - HTTP method
 * @param path - path under `/api`
 * @param opts - Bearer token and JSON or form body
 * @returns status and JSON body (or `null`)
 */
export async function raw(
  method: string,
  path: string,
  opts: { token?: string, json?: unknown, form?: Record<string, string> } = {},
): Promise<{ status: number, body: any, headers: Headers }> {
  const headers: Record<string, string> = {}
  let body: string | undefined
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.json)
  } else if (opts.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(opts.form).toString()
  }
  const res = await fetch(`${ORIGIN}/api${path}`, { method, headers, body })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers }
}

/**
 * Password login (form-urlencoded, like `AuthManager`).
 *
 * @param username - user
 * @returns the tokens
 */
export async function login(username: string): Promise<Tokens> {
  const res = await raw('POST', '/auth/token', {
    form: { username, password: PASSWORD, scope: '', grant_type: 'password' },
  })
  if (res.status !== 200) throw new Error(`login ${username}: HTTP ${res.status}`)
  return res.body as Tokens
}

/**
 * Frontend HTTP client (`@ilpachi/use-alova`, the same as the shell) with token and envelope unwrapping.
 *
 * @param base - base path under `/api` (e.g. `/auth`, `/admin/models`)
 * @param token - access token
 * @returns client with `Get/Post/Put/Patch/Delete`
 */
export function http(base: string, token: string) {
  const factory = createUseAlova({
    baseURL: ORIGIN,
    token: () => token,
    autoError: false,
    unwrapEnvelope: true,
    cacheFor: { GET: null },
  })
  return factory({ url: `/api${base}` }).alova as any
}

/**
 * Runs a request that must fail and returns the status and body of the error.
 *
 * @param fn - request
 * @returns HTTP status and JSON body
 */
export async function failure(fn: () => PromiseLike<unknown>): Promise<{ status: number, body: any }> {
  try {
    await fn()
  } catch (e: any) {
    const body = await e.response?.clone().json().catch(() => null)
    return { status: e.status ?? e.response?.status ?? 0, body }
  }
  throw new Error('the request was expected to fail')
}
