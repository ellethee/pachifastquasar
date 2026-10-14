import { createUseAlova } from '@ilpachi/use-alova'

/** Base URL del backend di prova (`COMPAT_PORT`, default 8030). */
export const ORIGIN = `http://127.0.0.1:${process.env.COMPAT_PORT ?? '8030'}`
/** Password degli utenti di prova: `COMPAT_PASSWORD` (come in compat/backend.sh); credenziale locale usa e getta, non un segreto. */
export const PASSWORD = process.env.COMPAT_PASSWORD ?? 'Compat-Test-1234!'

/** Coppia di token restituita da `POST /api/auth/token`. */
export interface Tokens {
  access_token: string
  token_type: string
  refresh_token: string
}

/**
 * Chiamata HTTP grezza (fetch) con il contratto documentato, per i controlli sul formato esatto della risposta.
 *
 * @param method - metodo HTTP
 * @param path - percorso sotto `/api`
 * @param opts - token Bearer e corpo JSON o form
 * @returns stato e corpo JSON (o `null`)
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
 * Login con password (form-urlencoded, come `AuthManager`).
 *
 * @param username - utente
 * @returns i token
 */
export async function login(username: string): Promise<Tokens> {
  const res = await raw('POST', '/auth/token', {
    form: { username, password: PASSWORD, scope: '', grant_type: 'password' },
  })
  if (res.status !== 200) throw new Error(`login ${username}: HTTP ${res.status}`)
  return res.body as Tokens
}

/**
 * Client HTTP del frontend (`@ilpachi/use-alova`, lo stesso della shell) con token e unwrap dell'envelope.
 *
 * @param base - percorso base sotto `/api` (es. `/auth`, `/admin/models`)
 * @param token - access token
 * @returns client con `Get/Post/Put/Patch/Delete`
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
 * Esegue una richiesta che deve fallire e restituisce stato e corpo dell'errore.
 *
 * @param fn - richiesta
 * @returns stato HTTP e corpo JSON
 */
export async function failure(fn: () => PromiseLike<unknown>): Promise<{ status: number, body: any }> {
  try {
    await fn()
  } catch (e: any) {
    const body = await e.response?.clone().json().catch(() => null)
    return { status: e.status ?? e.response?.status ?? 0, body }
  }
  throw new Error('la richiesta doveva fallire')
}
