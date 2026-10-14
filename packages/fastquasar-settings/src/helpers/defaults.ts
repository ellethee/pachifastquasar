import { applyKey } from './apply'
import type { ISettingsSchemaResponse } from '../types/settings-manager'

/** Mappa `categoria.campo` -> valore predefinito. */
export type SettingsDefaultsMap = Record<string, unknown>

/**
 * Valori predefiniti usati SOLO come fallback con backend precedenti a pachifast 0.6.0, il cui schema non espone
 * `default` per i campi. Se lo schema ha `default` (anche `null`) vince sempre lo schema.
 */
export const FALLBACK_DEFAULTS: Readonly<SettingsDefaultsMap> = {
  'appearance.theme': 'auto',
  'appearance.accent': 'teal',
  'appearance.density': 'comf',
  'appearance.fontScale': 'md',
  'appearance.reduceMotion': false,
  'preferences.locale': null,
}

/**
 * Risolve il valore predefinito di un campo: `default` dello schema se presente (anche `null`, es. lingua
 * automatica), altrimenti il fallback per i campi standard ({@link FALLBACK_DEFAULTS}).
 *
 * @param schema - schema delle impostazioni
 * @param category - categoria
 * @param field - chiave del campo
 * @returns `{ found, value }`: `found` è `false` se non esiste alcun default
 */
export function resolveFieldDefault(
  schema: ISettingsSchemaResponse,
  category: string,
  field: string,
): { found: boolean; value: unknown } {
  const spec = schema[category]?.fields?.[field]
  if (!spec) return { found: false, value: undefined }
  if (Object.hasOwn(spec, 'default')) return { found: true, value: spec.default }
  const key = applyKey(category, field)
  if (Object.hasOwn(FALLBACK_DEFAULTS, key)) return { found: true, value: FALLBACK_DEFAULTS[key] }
  return { found: false, value: undefined }
}

/**
 * Raccoglie i default di tutti i campi dello schema che ne hanno uno (schema o fallback).
 *
 * @param schema - schema delle impostazioni
 * @returns mappa `categoria.campo` -> default
 */
export function collectDefaults(schema: ISettingsSchemaResponse): SettingsDefaultsMap {
  const out: SettingsDefaultsMap = {}
  for (const [category, section] of Object.entries(schema)) {
    for (const field of Object.keys(section.fields ?? {})) {
      const r = resolveFieldDefault(schema, category, field)
      if (r.found) out[applyKey(category, field)] = r.value
    }
  }
  return out
}
