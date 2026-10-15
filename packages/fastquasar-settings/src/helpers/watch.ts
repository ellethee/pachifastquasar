import type { ISettingsSchemaResponse } from '../types/settings-manager'
import { warnOnce, type SettingsActionSpec } from './actions'

/** A resolved `watch` trigger: when `section`/`field` changes, run `spec`. */
export interface IWatchTarget {
  /** Section (category) of the watched field. */
  section: string
  /** Key of the watched field (as in the schema). */
  field: string
  /** Action to run. */
  spec: SettingsActionSpec
}

/**
 * Converts `snake_case` to `camelCase` (the schema uses camelCase keys, Python models use snake_case).
 *
 * @param key - key
 * @returns key in camelCase
 */
export function toCamelCase(key: string): string {
  return key.replace(/_+([a-zA-Z0-9])/g, (_m, c: string) => c.toUpperCase())
}

/**
 * Finds in the schema the field named by a `watch` key: `field` (same section as the field declaring
 * the watch) or `section.field`; the snake_case form is accepted too.
 *
 * @param schema - full schema
 * @param section - section of the field declaring the watch
 * @param key - `watch` key
 * @returns `{ section, field }` or `null` if the field does not exist
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
 * Resolves the `watch` of a field into the fields to observe, with the backend semantics: the KEY of
 * `{ watchedField: action }` is the field whose change triggers the action.
 * If the key matches no field, it falls back (with a warning) to the field declaring the watch,
 * as earlier versions did. `watch: true` (legacy) observes the field itself with its `events`.
 *
 * @param schema - full schema
 * @param section - section of the field declaring the watch
 * @param fieldKey - key of the field declaring the watch
 * @returns triggers to register
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
      `Settings: watch "${key}" of ${section}.${fieldKey} matches no field: watching the field that declares it`,
    )
    return { section, field: fieldKey, spec }
  })
}
