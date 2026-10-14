import type { ISettingsSchemaResponse } from '../types/settings-manager'

/** Mappa `categoria.campo` -> nome dell'applier. */
export type SettingsApplyMap = Record<string, string>

/**
 * Applier assegnati ai campi standard quando lo schema del backend non dichiara `apply`
 * (backend precedente al contratto `apply`). Valgono solo se il campo esiste nello schema e non ha `apply`.
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

/** Chiave della mappa per un campo. */
export function applyKey(category: string, field: string): string {
  return `${category}.${field}`
}

/**
 * Ricava dallo schema quali campi hanno un applier: il nome è `field.apply` (stringa); `apply: null`/`''` lo
 * disattiva; se `apply` manca valgono i default per i campi standard ({@link DEFAULT_APPLY}).
 *
 * @param schema - schema delle impostazioni
 * @returns mappa `categoria.campo` -> nome dell'applier
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
