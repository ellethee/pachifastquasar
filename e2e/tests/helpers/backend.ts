/** Base URL of the compat backend (`COMPAT_PORT`, default 8030): the tests talk to it directly for seeding/cleanup. */
export const BACKEND = `http://127.0.0.1:${process.env.COMPAT_PORT ?? '8030'}`

/** Password of the test users: `COMPAT_PASSWORD` (same default as compat/backend.sh; a disposable local credential). */
export const PASSWORD = process.env.COMPAT_PASSWORD ?? 'Compat-Test-1234!'

/** Test users created by `compat/backend.sh prepare`. */
export const USERS = { admin: 'admin', limited: 'limited' } as const

/** Token pair returned by `POST /api/auth/token`. */
export interface Tokens {
  access_token: string
  refresh_token: string
}

/**
 * Raw call to the backend API with the pachifast envelope unwrapped.
 *
 * @param method - HTTP method
 * @param path - path under `/api`
 * @param opts - bearer token and JSON body
 * @returns status and parsed body (`null` when empty)
 */
export async function api(
  method: string,
  path: string,
  opts: { token?: string; json?: unknown } = {},
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {}
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  if (opts.json !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BACKEND}/api${path}`, {
    method,
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined,
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

/**
 * Logs a test user in through the API.
 *
 * @param username - `admin` or `limited`
 * @returns the token pair
 */
export async function apiLogin(username: string): Promise<Tokens> {
  const res = await fetch(`${BACKEND}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password: PASSWORD, scope: '', grant_type: 'password' }),
  })
  if (res.status !== 200) throw new Error(`login ${username}: HTTP ${res.status}`)
  return (await res.json()) as Tokens
}
