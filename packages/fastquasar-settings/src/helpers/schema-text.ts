import { getPachiI18n, pachiT } from '@ilpachi/pachi-i18n'
import type { ISettingsCategory, ISettingsSchema } from '../types/settings-manager'

/**
 * Translates a backend message key (e.g. `settings.audit.title`) into the current language.
 * If the key is missing (or absent from the app messages) it returns `fallback`.
 *
 * @param key - key sent by the backend (`titleKey`, `labelKey`, values of `propertyKeys`/`optionKeys`)
 * @param fallback - text already present in the schema (translated by the backend or in English)
 */
export function resolveSchemaText(key: string | undefined, fallback: string): string
export function resolveSchemaText(key: string | undefined, fallback: string | undefined): string | undefined
export function resolveSchemaText(key: string | undefined, fallback: string | undefined): string | undefined {
  if (!key) return fallback
  // `te` with a dynamic key: avoids the recursive typing of the messages schema
  const global = getPachiI18n()?.global as unknown as { te: (key: string) => boolean } | undefined
  return global?.te(key) ? pachiT(key) : fallback
}

/** Title of a section: translated `titleKey`, otherwise `title`. */
export function sectionTitle(category: ISettingsCategory & { titleKey?: string }): string {
  return resolveSchemaText(category.titleKey, category.title)
}

/**
 * Properties to pass to a field's component, with texts translated from the schema keys:
 * - `label`: `propertyKeys.label`, then `labelKey`, then the value already present;
 * - other text properties (`hint`, `placeholder`, ...): `propertyKeys.<name>`;
 * - `options[].label`: `optionKeys.<value>`.
 * Does not modify the original schema.
 *
 * @param field - schema field
 */
export function fieldProperties(field: ISettingsSchema): Record<string, unknown> {
  const properties: Record<string, unknown> = { ...field.properties }
  for (const [name, key] of Object.entries(field.propertyKeys ?? {})) {
    const current = properties[name]
    if (typeof current === 'string' || current === undefined) {
      properties[name] = resolveSchemaText(key, current as string | undefined)
    }
  }
  if (field.labelKey && !field.propertyKeys?.label) {
    const current = properties.label
    properties.label = resolveSchemaText(field.labelKey, typeof current === 'string' ? current : field.label)
  }
  const optionKeys = field.optionKeys
  if (optionKeys && Array.isArray(properties.options)) {
    properties.options = (properties.options as Record<string, unknown>[]).map((option) => {
      const key = optionKeys[String(option.value)]
      return key && typeof option.label === 'string' ? { ...option, label: resolveSchemaText(key, option.label) } : option
    })
  }
  return properties
}
