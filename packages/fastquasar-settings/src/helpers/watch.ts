import type { ISettingsSchemaResponse } from '../types/settings-manager'
import { warnOnce, type SettingsActionSpec } from './actions'

/** Un trigger `watch` risolto: quando cambia `section`/`field` esegui `spec`. */
export interface IWatchTarget {
  /** Sezione (categoria) del campo osservato. */
  section: string
  /** Chiave del campo osservato (come nello schema). */
  field: string
  /** Azione da eseguire. */
  spec: SettingsActionSpec
}

/**
 * Converte `snake_case` in `camelCase` (lo schema usa chiavi camelCase, i modelli Python snake_case).
 *
 * @param key - chiave
 * @returns chiave in camelCase
 */
export function toCamelCase(key: string): string {
  return key.replace(/_+([a-zA-Z0-9])/g, (_m, c: string) => c.toUpperCase())
}

/**
 * Trova nello schema il campo indicato da una chiave di `watch`: `campo` (stessa sezione del campo che dichiara
 * il watch) oppure `sezione.campo`; accetta anche la forma snake_case.
 *
 * @param schema - schema completo
 * @param section - sezione del campo che dichiara il watch
 * @param key - chiave di `watch`
 * @returns `{ section, field }` oppure `null` se il campo non esiste
 */
export function findWatchedField(
  schema: ISettingsSchemaResponse,
  section: string,
  key: string,
): { section: string; field: string } | null {
  const candidates: Array<[string, string]> = [[section, key]]
  const dot = key.indexOf('.')
  if (dot > 0) candidates.push([key.slice(0, dot), key.slice(dot + 1)])
  for (const [sec, name] of candidates) {
    const fields = Object.hasOwn(schema, sec) ? schema[sec]?.fields : undefined
    if (!fields) continue
    for (const f of [name, toCamelCase(name)]) {
      if (Object.hasOwn(fields, f)) return { section: sec, field: f }
    }
  }
  return null
}

/**
 * Risolve il `watch` di un campo nei campi da osservare, con la semantica del backend: la CHIAVE di
 * `{ campoOsservato: azione }` è il campo il cui cambiamento fa partire l'azione.
 * Se la chiave non corrisponde ad alcun campo si ricade (con un warning) sul campo che dichiara il watch,
 * come facevano le versioni precedenti. `watch: true` (legacy) osserva il campo stesso con gli `events`.
 *
 * @param schema - schema completo
 * @param section - sezione del campo che dichiara il watch
 * @param fieldKey - chiave del campo che dichiara il watch
 * @returns trigger da registrare
 */
export function resolveWatchTargets(
  schema: ISettingsSchemaResponse,
  section: string,
  fieldKey: string,
): IWatchTarget[] {
  const field = schema[section]?.fields[fieldKey]
  if (!field?.watch) return []
  if (field.watch === true) {
    return Object.values(field.events ?? {}).map((spec) => ({ section, field: fieldKey, spec }))
  }
  if (typeof field.watch !== 'object') return []
  return Object.entries(field.watch).map(([key, spec]) => {
    const found = findWatchedField(schema, section, key)
    if (found) return { ...found, spec }
    warnOnce(
      `watch:${section}.${fieldKey}:${key}`,
      `Settings: watch "${key}" di ${section}.${fieldKey} non corrisponde ad alcun campo: osservo il campo che lo dichiara`,
    )
    return { section, field: fieldKey, spec }
  })
}
