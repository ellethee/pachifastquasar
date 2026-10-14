import { getPachiI18n, pachiT } from '@ilpachi/pachi-i18n'
import type { ISettingsCategory, ISettingsSchema } from '../types/settings-manager'

/**
 * Traduce una chiave di messaggio del backend (es. `settings.audit.title`) nella lingua corrente.
 * Se la chiave manca (o non è presente nei messaggi dell'app) restituisce `fallback`.
 *
 * @param key - chiave inviata dal backend (`titleKey`, `labelKey`, valori di `propertyKeys`/`optionKeys`)
 * @param fallback - testo già presente nello schema (tradotto dal backend o in inglese)
 */
export function resolveSchemaText(key: string | undefined, fallback: string): string
export function resolveSchemaText(key: string | undefined, fallback: string | undefined): string | undefined
export function resolveSchemaText(key: string | undefined, fallback: string | undefined): string | undefined {
  if (!key) return fallback
  // `te` con chiave dinamica: si evita la tipizzazione ricorsiva dello schema dei messaggi
  const global = getPachiI18n()?.global as unknown as { te: (key: string) => boolean } | undefined
  return global?.te(key) ? pachiT(key) : fallback
}

/** Titolo di una sezione: `titleKey` tradotta, altrimenti `title`. */
export function sectionTitle(category: ISettingsCategory & { titleKey?: string }): string {
  return resolveSchemaText(category.titleKey, category.title)
}

/**
 * Proprietà da passare al componente di un campo con i testi tradotti dalle chiavi dello schema:
 * - `label`: `propertyKeys.label`, poi `labelKey`, poi il valore già presente;
 * - altre proprietà di testo (`hint`, `placeholder`, ...): `propertyKeys.<nome>`;
 * - `options[].label`: `optionKeys.<value>`.
 * Non modifica lo schema originale.
 *
 * @param field - campo dello schema
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
