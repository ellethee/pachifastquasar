/** Singolo errore del backend (`detail[]`). */
export interface IPachiApiErrorItem {
  /** Codice stabile (es. `admin.object_not_found`), se presente. */
  code?: string
  /** Messaggio del backend (lingua del server). */
  msg?: string
  /** Parametri per l'interpolazione (es. `{ permissions: ['demo.item.view'] }`). */
  params?: Record<string, unknown>
  /** Posizione dell'errore (es. `['body', 'name']`). */
  loc?: Array<string | number>
}

/** Errore HTTP normalizzato. */
export interface IPachiApiError {
  /** Codice HTTP (0 se di rete / sconosciuto). */
  status: number
  /** Voci di `detail` (vuoto se il corpo non è nel formato atteso). */
  items: IPachiApiErrorItem[]
}

/** Famiglia di errore, utile per scegliere come mostrarlo. */
export type AdminErrorKind =
  | 'validation'
  | 'conflict'
  | 'forbidden'
  | 'notFound'
  | 'unauthorized'
  | 'network'
  | 'other'

/** Funzioni di traduzione necessarie a {@link describeError}. */
export interface IPachiErrorTranslator {
  /** `true` se la chiave esiste. */
  te: (key: string) => boolean
  /** Traduce la chiave con i parametri. */
  t: (key: string, params?: Record<string, unknown>) => string
}

/** Descrizione di un errore pronta per la UI. */
export interface IAdminErrorDescription {
  kind: AdminErrorKind
  status: number
  /** Messaggio generale (mai vuoto). */
  message: string
  /** Messaggi per campo (solo 422 con `loc` `["body", <campo>]`). */
  fields: Record<string, string>
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
 * Normalizza un errore lanciato dal client HTTP: `ResponseError` di `@ilpachi/use-alova` (legge il corpo con
 * `safeResponseJson`), errore con `status` numerico e `body` o qualunque altro (status 0).
 *
 * @param err - valore lanciato dalla richiesta
 * @returns errore normalizzato (mai lancia)
 */
export async function parseApiError(err: unknown): Promise<IPachiApiError> {
  if (err === null || typeof err !== 'object') return { status: 0, items: [] }
  const rec = err as { status?: unknown, body?: unknown, safeResponseJson?: () => Promise<unknown> }
  const status = typeof rec.status === 'number' ? rec.status : 0
  let body: unknown = rec.body ?? null
  if (typeof rec.safeResponseJson === 'function') {
    try {
      body = await rec.safeResponseJson()
    } catch {
      body = null
    }
  }
  return { status, items: parseErrorBody(body) }
}

/**
 * Famiglia di un errore: 422 validation, 409 conflict, 403 forbidden, 404 notFound, 401 unauthorized, 0 network.
 *
 * @param status - codice HTTP
 */
export function errorKind(status: number): AdminErrorKind {
  switch (status) {
    case 422:
    case 400:
      return 'validation'
    case 409:
      return 'conflict'
    case 403:
      return 'forbidden'
    case 404:
      return 'notFound'
    case 401:
      return 'unauthorized'
    case 0:
      return 'network'
    default:
      return 'other'
  }
}

/**
 * Chiave del messaggio del package per un codice (`admin.object_not_found` → `pachiAdmin.errors.codes.admin_object_not_found`).
 *
 * @param code - codice del backend
 */
export function packageCodeKey(code: string): string {
  return `pachiAdmin.errors.codes.${code.replace(/[^A-Za-z0-9_]/g, '_')}`
}

/**
 * `snake_case` → `camelCase` (gli errori del backend possono citare il nome Python del campo).
 *
 * @param name - nome del campo
 */
export function camelize(name: string): string {
  return name.replace(/(?<!_)_([a-z0-9])/g, (_m, c: string) => c.toUpperCase())
}

/**
 * Parametri pronti per l'interpolazione: gli array diventano testo separato da virgole.
 *
 * @param params - parametri del backend
 */
export function interpolationParams(params: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params ?? {})) {
    out[key] = Array.isArray(value) ? value.join(', ') : value
  }
  return out
}

/**
 * Messaggio di una voce. Ordine: traduzione dell'app `errors.codes.<code>`, traduzione del package, `msg`
 * del backend.
 *
 * @param item - voce di errore
 * @param tr - funzioni di traduzione
 * @returns il testo, o `undefined` se la voce non ha né codice noto né `msg`
 */
export function itemMessage(item: IPachiApiErrorItem, tr: IPachiErrorTranslator): string | undefined {
  const params = interpolationParams(item.params)
  if (item.code) {
    const appKey = `errors.codes.${item.code}`
    if (tr.te(appKey)) return tr.t(appKey, params)
    const pkgKey = packageCodeKey(item.code)
    if (tr.te(pkgKey)) return tr.t(pkgKey, params)
  }
  return item.msg
}

/**
 * Campo a cui si riferisce una voce (`loc` = `["body", "<campo>"]` o `["query", "<parametro>"]`; il parametro di
 * un filtro a intervallo è `<campo>__gte` / `<campo>__lte`).
 *
 * @param item - voce di errore
 * @returns nome camelCase del campo, o `undefined`
 */
export function itemField(item: IPachiApiErrorItem): string | undefined {
  const loc = item.loc
  if (!loc || loc.length < 2 || (loc[0] !== 'body' && loc[0] !== 'query')) return undefined
  const name = loc[1]
  return typeof name === 'string' ? camelize(name) : undefined
}

/**
 * Descrive un errore per la UI: famiglia, messaggio generale e messaggi per campo (422).
 * 409 `admin.integrity_error`, 403 `access.permissions_missing`, 404 `admin.*_not_found` hanno testi del package.
 *
 * @param error - errore normalizzato
 * @param tr - funzioni di traduzione
 * @returns descrizione (mai lancia)
 */
export function describeError(error: IPachiApiError, tr: IPachiErrorTranslator): IAdminErrorDescription {
  const kind = errorKind(error.status)
  const fields: Record<string, string> = {}
  const general: string[] = []
  for (const item of error.items) {
    const message = itemMessage(item, tr)
    const field = kind === 'validation' ? itemField(item) : undefined
    // `orderBy` e `ids` non sono campi di un form: restano messaggi generali
    const isParam = item.loc?.[1] === 'orderBy' || item.loc?.[1] === 'ids'
    if (field && message && !isParam) {
      fields[field] ??= message
    } else if (message) {
      general.push(message)
    }
  }
  let message = general[0]
  if (!message && Object.keys(fields).length) message = tr.t('pachiAdmin.errors.validation')
  if (!message) message = tr.t(`pachiAdmin.errors.${kind}`)
  return { kind, status: error.status, message, fields }
}
