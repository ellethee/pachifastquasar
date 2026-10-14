import type { IFieldDef, IFieldsState } from '../types'

/** `pageSize` di default richiesto al backend per un select remoto (una sola fetch, niente paginazione). */
export const REMOTE_SELECT_PAGE_SIZE = 1000

/**
 * Costruisce la query string della GET delle opzioni di un select remoto.
 *
 * @param field - definizione del campo (`pageSize` opzionale per sovrascrivere il default)
 * @returns parametri di query
 */
export function buildRemoteQuery(
  field: Pick<IFieldDef, 'pageSize' | 'params' | 'dependsOn'>,
  values: IFieldsState = {},
): Record<string, string | number> {
  const size = Number(field.pageSize)
  return {
    ...resolveFieldParams(field, values),
    pageSize: Number.isFinite(size) && size > 0 ? size : REMOTE_SELECT_PAGE_SIZE,
  }
}

/** `true` se il valore è considerato vuoto (`null`, `undefined`, `''`, array vuoto). */
export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)
}

/**
 * Nomi dei campi da cui dipende `field` (`dependsOn` normalizzato in array).
 *
 * @param field - definizione del campo
 * @returns elenco dei nomi (vuoto se non ci sono dipendenze)
 */
export function dependencyNames(field: Pick<IFieldDef, 'dependsOn'>): string[] {
  const deps = field.dependsOn
  if (!deps) return []
  return Array.isArray(deps) ? deps : [deps]
}

/**
 * `true` se tutte le dipendenze del campo hanno un valore (un campo senza dipendenze è sempre pronto).
 *
 * @param field - definizione del campo
 * @param values - valori correnti della sezione
 */
export function dependenciesReady(field: Pick<IFieldDef, 'dependsOn'>, values: IFieldsState): boolean {
  return dependencyNames(field).every((name) => !isEmptyValue(values[name]))
}

/**
 * Query param extra di un campo: `params` (oggetto o funzione dei valori) oppure, se assente,
 * le dipendenze come `<campo>=<valore>`. Scarta i valori vuoti; gli array diventano `a,b`.
 *
 * @param field - definizione del campo
 * @param values - valori correnti della sezione
 * @returns parametri pronti per la query string
 */
export function resolveFieldParams(
  field: Pick<IFieldDef, 'params' | 'dependsOn'>,
  values: IFieldsState,
): Record<string, string | number> {
  const raw =
    typeof field.params === 'function'
      ? field.params(values)
      : (field.params ??
        Object.fromEntries(dependencyNames(field).map((name) => [name, values[name]])))
  const out: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (isEmptyValue(value)) continue
    out[key] = typeof value === 'number' ? value : Array.isArray(value) ? value.join(',') : String(value)
  }
  return out
}

/** Risultato normalizzato di una risposta di lista. */
export interface IParsedRemoteResponse {
  items: unknown[]
  /** Totale dichiarato dal backend (solo risposta paginata). */
  total?: number
}

/**
 * Normalizza la risposta del backend: accetta sia `{ items, total, ... }` sia un array puro.
 *
 * @param res - corpo JSON della risposta
 * @returns elementi e totale (se noto)
 */
export function parseRemoteResponse(res: unknown): IParsedRemoteResponse {
  if (Array.isArray(res)) return { items: res }
  if (res && typeof res === 'object') {
    const { items, total } = res as { items?: unknown; total?: unknown }
    return {
      items: Array.isArray(items) ? items : [],
      ...(typeof total === 'number' ? { total } : {}),
    }
  }
  return { items: [] }
}
