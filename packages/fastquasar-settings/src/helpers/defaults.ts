import { applyKey } from './apply'
import type { ISettingsSchemaResponse } from '../types/settings-manager'

/** `category.field` -> default value map. */
export type SettingsDefaultsMap = Record<string, unknown>

/**
 * Default values used ONLY as a fallback with backends older than pachifast 0.6.0, whose schema does not expose
 * `default` for fields. If the schema has `default` (even `null`) the schema always wins.
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
 * Resolves the default value of a field: the schema `default` if present (even `null`, e.g. automatic
 * language), otherwise the fallback for standard fields ({@link FALLBACK_DEFAULTS}).
 *
 * @param schema - settings schema
 * @param category - category
 * @param field - field key
 * @returns `{ found, value }`: `found` is `false` if no default exists
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
 * Collects the defaults of all schema fields that have one (schema or fallback).
 *
 * @param schema - settings schema
 * @returns `category.field` -> default map
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
