import type { IOrderState } from '../types/pachitable2'

/**
 * Costruisce il valore del parametro `orderBy` (colonne separate da virgola, prefisso `-` per il discendente).
 *
 * @param sortState - stato di ordinamento multiplo
 * @returns stringa tipo `name,-createdAt`
 */
export function buildOrderBy(sortState: IOrderState[]): string {
  return sortState.map(s => `${s.direction === 'desc' ? '-' : ''}${s.column}`).join(',')
}

/** Ingressi per la costruzione dei parametri di richiesta della lista. */
export interface IRequestParamsInput {
  page: number
  pageSize: number
  /** Con la paginazione locale `orderBy` e `search` non vengono inviati. */
  localPagination: boolean
  orderBy: string
  search: string | null | undefined
  /** Parametri extra: sovrascrivono quelli standard con lo stesso nome. */
  extraParams?: Record<string, unknown>
}

/**
 * Costruisce i parametri query della richiesta di lista (`page`, `pageSize`, `orderBy`, `search` + extra).
 *
 * @param input - ingressi della richiesta
 * @returns oggetto dei parametri
 */
export function buildRequestParams(input: IRequestParamsInput): Record<string, unknown> {
  return {
    page: input.page,
    pageSize: input.pageSize,
    // `search` arriva da un `q-input clearable`, che al clic sulla X emette `null`: niente "search=null"
    ...(input.localPagination ? {} : { orderBy: input.orderBy, search: input.search ?? '' }),
    ...(input.extraParams ?? {}),
  }
}

/**
 * Codifica i parametri query per alova, che li concatena all'URL senza encoding (`&`, `#`, `+`, `%` nei valori romperebbero
 * la query) e converte `null` in "null". I valori `null`/`undefined` sono omessi.
 *
 * @param params - parametri (anche extra dell'app)
 * @returns parametri con chiavi e valori gia' codificati con `encodeURIComponent`
 */
export function encodeQueryParams(params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    out[encodeURIComponent(key)] = encodeURIComponent(String(value))
  }
  return out
}

/**
 * Segmento di percorso per una chiave di riga (`/<chiave>`): la chiave puo' contenere `/`, `?`, `#`.
 *
 * @param key - valore della chiave primaria
 * @returns la chiave codificata
 */
export function encodeKey(key: unknown): string {
  return encodeURIComponent(String(key))
}

/**
 * Confronto shallow di due array (stessa lunghezza e stessi elementi per identità).
 *
 * @param a - primo array
 * @param b - secondo array
 * @returns true se uguali
 */
export function shallowEqualArrays(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
}
