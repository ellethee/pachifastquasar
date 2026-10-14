/** Ordinamento di una colonna. */
export interface IAdminSort {
  field: string
  descending: boolean
}

/** Parametri di una richiesta di lista. */
export interface IAdminListQuery {
  page: number
  pageSize: number
  /** Ordinamento scelto dall'utente (uno solo); assente = default del backend. */
  sort?: IAdminSort | null | undefined
  /** Ordinamento multiplo (priorità = ordine dell'array); ha la precedenza su `sort`. */
  sorts?: IAdminSort[] | undefined
  search?: string | undefined
  /** Valori dei filtri per nome di campo (vuoti omessi). */
  filters?: Record<string, unknown> | undefined
}

/** Dimensioni di pagina offerte. */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const

/** Dimensione di pagina di default (quella del backend). */
export const DEFAULT_PAGE_SIZE = 25

/**
 * Interpreta una voce di `list.ordering` (`campo` o `-campo`).
 *
 * @param entry - voce dell'ordinamento
 * @returns campo e direzione
 */
export function parseOrdering(entry: string): IAdminSort {
  return entry.startsWith('-') ? { field: entry.slice(1), descending: true } : { field: entry, descending: false }
}

/**
 * Ordinamento successivo dopo il clic su una colonna. Senza `multi` (clic semplice) sostituisce l'ordinamento
 * con quella colonna: crescente, poi decrescente, poi nessuno. Con `multi` (Maiusc+clic) aggiunge la colonna in
 * coda (o ne inverte la direzione, o la toglie dopo il decrescente) mantenendo le altre.
 *
 * @param current - ordinamento corrente
 * @param field - colonna cliccata
 * @param multi - `true` per l'ordinamento multiplo
 * @returns il nuovo ordinamento
 */
export function nextSorts(current: IAdminSort[], field: string, multi: boolean): IAdminSort[] {
  const existing = current.find((s) => s.field === field)
  if (!multi) {
    if (!existing || current.length > 1) return [{ field, descending: false }]
    return existing.descending ? [] : [{ field, descending: true }]
  }
  if (!existing) return [...current, { field, descending: false }]
  if (!existing.descending) return current.map((s) => (s.field === field ? { ...s, descending: true } : s))
  return current.filter((s) => s.field !== field)
}

/**
 * Valore del parametro `orderBy` (`campo` o `-campo`).
 *
 * @param sort - ordinamento
 */
export function toOrderBy(sort: IAdminSort): string {
  return `${sort.descending ? '-' : ''}${sort.field}`
}

/**
 * Query string di una lista: `page`, `pageSize`, `orderBy`, `search` e un parametro per ogni filtro valorizzato.
 * I booleani diventano `true`/`false`; `null`, `undefined`, `''` e array vuoti sono omessi.
 *
 * @param query - parametri
 * @returns query string senza `?` (stringa vuota se non ci sono parametri)
 */
export function buildListQuery(query: IAdminListQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  const sorts = query.sorts ?? (query.sort ? [query.sort] : [])
  if (sorts.length) params.set('orderBy', sorts.map(toOrderBy).join(','))
  const search = query.search?.trim()
  if (search) params.set('search', search)
  for (const [name, value] of Object.entries(query.filters ?? {})) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) params.set(name, value.join(','))
      continue
    }
    params.set(name, String(value))
  }
  return params.toString()
}

/**
 * Query string di `_options` (lookup): ricerca, pagina e/o `ids` per risolvere i valori già salvati.
 *
 * @param opts - `search`, `page`, `pageSize` oppure `ids`
 * @returns query string senza `?`
 */
export function buildOptionsQuery(opts: {
  search?: string | undefined
  page?: number | undefined
  pageSize?: number | undefined
  ids?: Array<number | string> | undefined
}): string {
  const params = new URLSearchParams()
  if (opts.ids?.length) params.set('ids', opts.ids.join(','))
  const search = opts.search?.trim()
  if (search) params.set('search', search)
  if (opts.page) params.set('page', String(opts.page))
  if (opts.pageSize) params.set('pageSize', String(opts.pageSize))
  return params.toString()
}

/**
 * Valore di un estremo di intervallo. Per un filtro `datetime` con la sola data, `__gte` è l'inizio del giorno e
 * `__lte` la fine del giorno (ora locale dell'utente) in ISO UTC; un valore con l'ora è convertito in ISO UTC.
 * Gli altri tipi (numeri, `date`, `time`) restano com'è.
 *
 * @param component - tipo del filtro
 * @param bound - `gte` o `lte`
 * @param value - valore dell'input
 * @returns il valore da inviare
 */
export function rangeValue(component: string, bound: 'gte' | 'lte', value: unknown): unknown {
  if (component !== 'datetime' || typeof value !== 'string') return value
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (day) {
    const [y, m, d] = [Number(day[1]), Number(day[2]) - 1, Number(day[3])]
    const date = bound === 'gte' ? new Date(y, m, d, 0, 0, 0, 0) : new Date(y, m, d, 23, 59, 59, 999)
    return date.toISOString()
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

/**
 * Parametri di filtro per la richiesta: uguaglianza `?campo=valore`; per i filtri con `range` i parametri
 * `campo__gte` e `campo__lte` (i valori dell'input stanno in `values` con le stesse chiavi).
 *
 * @param filters - filtri dello schema
 * @param values - valori degli input per chiave (`campo`, `campo__gte`, `campo__lte`)
 * @returns i parametri valorizzati
 */
export function filterQueryParams(
  filters: Array<{ field: string, component: string, range?: boolean | undefined }>,
  values: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const filled = (v: unknown): boolean => v !== null && v !== undefined && v !== ''
  for (const f of filters) {
    if (f.range) {
      for (const bound of ['gte', 'lte'] as const) {
        const v = values[`${f.field}__${bound}`]
        if (filled(v)) out[`${f.field}__${bound}`] = rangeValue(f.component, bound, v)
      }
    } else if (filled(values[f.field])) {
      out[f.field] = values[f.field]
    }
  }
  return out
}
