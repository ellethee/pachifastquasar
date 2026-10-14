import { parseRetryAfter } from './retry-after'

/** Singolo errore del backend (`detail[]`). */
export interface IPachiApiErrorItem {
  /** Codice stabile (es. `auth.password_too_short`), se presente. */
  code?: string
  /** Messaggio del backend (lingua del server). */
  msg?: string
  /** Parametri per l'interpolazione (es. `{ min_length: 12 }`). */
  params?: Record<string, unknown>
  /** Posizione dell'errore (es. `['body', 'password']`). */
  loc?: Array<string | number>
}

/** Errore HTTP normalizzato. */
export interface IPachiApiError {
  /** Codice HTTP (0 se di rete / sconosciuto). */
  status: number
  /** Voci di `detail` (vuoto se il corpo non è nel formato atteso). */
  items: IPachiApiErrorItem[]
  /** Secondi di attesa dall'header `Retry-After` (solo se presente e valido, tipicamente su 429). */
  retryAfter?: number
}

/**
 * Estrae le voci di errore da un corpo `{ detail: [...] }` (o `{ detail: "testo" }`).
 *
 * @param body - corpo JSON della risposta d'errore
 * @returns le voci riconosciute
 */
export function parseErrorBody(body: unknown): IPachiApiErrorItem[] {
  if (body === null || typeof body !== 'object') return []
  const detail = (body as { detail?: unknown }).detail
  if (typeof detail === 'string') return [{ msg: detail }]
  if (!Array.isArray(detail)) return []
  const items: IPachiApiErrorItem[] = []
  for (const raw of detail) {
    if (raw === null || typeof raw !== 'object') continue
    const rec = raw as Record<string, unknown>
    const item: IPachiApiErrorItem = {}
    if (typeof rec.code === 'string') item.code = rec.code
    if (typeof rec.msg === 'string') item.msg = rec.msg
    if (rec.params !== null && typeof rec.params === 'object') item.params = rec.params as Record<string, unknown>
    if (Array.isArray(rec.loc)) item.loc = rec.loc as Array<string | number>
    items.push(item)
  }
  return items
}

/**
 * Legge `Retry-After` da un errore del client: `response.headers` (`ResponseError` di `@ilpachi/use-alova`,
 * che conserva la `Response`) oppure `headers` (errore con header diretti). Header Headers/oggetto, nomi senza distinzione
 * di maiuscole.
 *
 * @param err - valore lanciato dalla richiesta
 * @returns secondi di attesa, o `undefined` se l'header manca, non è valido o non è leggibile
 */
export function readRetryAfter(err: object): number | undefined {
  const rec = err as { response?: { headers?: unknown }, headers?: unknown }
  const headers = rec.response?.headers ?? rec.headers
  if (headers === null || typeof headers !== 'object') return undefined
  let raw: unknown
  const getter = (headers as { get?: unknown }).get
  if (typeof getter === 'function') {
    try {
      raw = getter.call(headers, 'Retry-After')
    } catch {
      raw = undefined
    }
  } else {
    const key = Object.keys(headers).find((k) => k.toLowerCase() === 'retry-after')
    raw = key ? (headers as Record<string, unknown>)[key] : undefined
  }
  return parseRetryAfter(raw) ?? undefined
}

/**
 * Normalizza un errore lanciato dal client HTTP: `ResponseError` di `@ilpachi/use-alova` (legge il corpo con
 * `safeResponseJson`), errore con `status` numerico e `body` o qualunque altro (status 0).
 *
 * @param err - valore lanciato dalla richiesta
 * @returns errore normalizzato (mai lancia)
 */
export async function parseApiError(err: unknown): Promise<IPachiApiError> {
  if (err === null || typeof err !== 'object') return { status: 0, items: [] }
  const rec = err as {
    status?: unknown
    body?: unknown
    safeResponseJson?: () => Promise<unknown>
  }
  const status = typeof rec.status === 'number' ? rec.status : 0
  let body: unknown = rec.body ?? null
  if (typeof rec.safeResponseJson === 'function') {
    try {
      body = await rec.safeResponseJson()
    } catch {
      body = null
    }
  }
  const retryAfter = readRetryAfter(err)
  return retryAfter === undefined ? { status, items: parseErrorBody(body) } : { status, items: parseErrorBody(body), retryAfter }
}

/**
 * Primo errore con un `code`, se esiste.
 *
 * @param error - errore normalizzato
 * @returns la voce con codice, altrimenti la prima voce, altrimenti `undefined`
 */
export function primaryItem(error: IPachiApiError): IPachiApiErrorItem | undefined {
  return error.items.find((i) => i.code) ?? error.items[0]
}

/** Funzioni di traduzione necessarie a {@link resolveErrorMessage}. */
export interface IPachiErrorTranslator {
  /** `true` se la chiave esiste (almeno in una lingua utile). */
  te: (key: string) => boolean
  /** Traduce la chiave con i parametri. */
  t: (key: string, params?: Record<string, unknown>) => string
}

/**
 * Chiave del messaggio del package per un codice (`auth.password_incorrect` → `pachiProfile.security.codes.auth_password_incorrect`).
 *
 * @param code - codice del backend
 * @returns chiave i18n del package
 */
export function packageCodeKey(code: string): string {
  return `pachiProfile.security.codes.${code.replace(/[^A-Za-z0-9_]/g, '_')}`
}

/**
 * Messaggio da mostrare per un errore. Ordine: traduzione dell'app `errors.codes.<code>`, traduzione del
 * package per lo stesso codice, `msg` del backend, messaggio per stato (429 «troppi tentativi»), generico.
 *
 * @param error - errore normalizzato
 * @param tr - funzioni di traduzione
 * @returns testo per l'utente
 */
export function resolveErrorMessage(error: IPachiApiError, tr: IPachiErrorTranslator): string {
  const item = primaryItem(error)
  const params = item?.params ?? {}
  if (item?.code) {
    const appKey = `errors.codes.${item.code}`
    if (tr.te(appKey)) return tr.t(appKey, params)
    const pkgKey = packageCodeKey(item.code)
    if (tr.te(pkgKey)) return tr.t(pkgKey, params)
  }
  if (item?.msg) return item.msg
  if (error.status === 429) return tr.t('pachiProfile.security.tooManyRequests')
  if (error.status === 0) return tr.t('pachiProfile.security.networkError')
  return tr.t('pachiProfile.security.genericError')
}
