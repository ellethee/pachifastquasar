import type { ISettingsSchemaResponse } from '../types/settings-manager'

/** `category.field` -> applier name map. */
export type SettingsApplyMap = Record<string, string>

/**
 * Appliers assigned to standard fields when the backend schema does not declare `apply`
 * (backend predating the `apply` contract). They only apply if the field exists in the schema and has no `apply`.
 */
export const DEFAULT_APPLY: Readonly<SettingsApplyMap> = {
  'appearance.theme': 'theme',
  'appearance.accent': 'accent',
  'appearance.density': 'density',
  'appearance.fontScale': 'fontScale',
  'appearance.reduceMotion': 'reduceMotion',
  'preferences.locale': 'locale',
  'preferences.theme': 'theme',
}

/** Map key for a field. */
export function applyKey(category: string, field: string): string {
  return `${category}.${field}`
}

/**
 * Derives from the schema which fields have an applier: the name is `field.apply` (string); `apply: null`/`''`
 * disables it; if `apply` is missing the defaults for standard fields apply ({@link DEFAULT_APPLY}).
 *
 * @param schema - settings schema
 * @returns `category.field` -> applier name map
 */
export function collectApplyMap(schema: ISettingsSchemaResponse): SettingsApplyMap {
  const map: SettingsApplyMap = {}
  for (const [category, section] of Object.entries(schema)) {
    for (const [field, spec] of Object.entries(section.fields ?? {})) {
      const key = applyKey(category, field)
      if (Object.hasOwn(spec, 'apply')) {
        if (typeof spec.apply === 'string' && spec.apply) map[key] = spec.apply
      } else if (Object.hasOwn(DEFAULT_APPLY, key)) {
        map[key] = DEFAULT_APPLY[key]!
      }
    }
  }
  return map
}
