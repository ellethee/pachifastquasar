import { getPachiI18n, pachiT } from '@ilpachi/pachi-i18n'
import type { IAdminAction, IAdminField, IAdminFilter, IAdminOption } from '../types/admin'
import { getPachiAdminOptions } from './options'

/** Risolutore di chiavi di messaggio (iniettabile per i test). */
export interface ITextResolver {
  /** `true` se la chiave esiste nella lingua corrente. */
  te: (key: string) => boolean
  /** Traduce la chiave. */
  t: (key: string) => string
}

/** Risolutore predefinito: i18n globale di `@ilpachi/pachi-i18n`. */
export const defaultResolver: ITextResolver = {
  te: (key) => {
    // `te` con chiave dinamica: si evita la tipizzazione ricorsiva dello schema dei messaggi
    const global = getPachiI18n()?.global as unknown as { te: (key: string) => boolean } | undefined
    return global?.te(key) ?? false
  },
  t: (key) => pachiT(key),
}

/**
 * Testo di una chiave del backend. Ordine: `labels` delle opzioni (per chiave), traduzione dell'app, `fallback`
 * (testo già presente nello schema, tradotto dal backend o in inglese).
 *
 * @param key - chiave del backend (`titleKey`, `labelKey`, valore di `optionKeys`)
 * @param fallback - testo dello schema
 * @param resolver - risolutore delle chiavi (default: i18n globale)
 * @param labels - sostituzioni per chiave (default: `labels` delle opzioni)
 * @returns il testo da mostrare
 */
export function resolveText(
  key: string | undefined,
  fallback: string,
  resolver: ITextResolver = defaultResolver,
  labels: Record<string, string> = getPachiAdminOptions().labels
): string {
  if (!key) return fallback
  const override = labels[key]
  if (override !== undefined) return override
  return resolver.te(key) ? resolver.t(key) : fallback
}

/**
 * Titolo di un modello.
 *
 * @param model - oggetto con `title` e `titleKey` (elenco modelli o schema)
 * @param resolver - risolutore delle chiavi
 */
export function modelTitle(
  model: { title: string, titleKey?: string | undefined },
  resolver?: ITextResolver
): string {
  return resolveText(model.titleKey, model.title, resolver)
}

/**
 * Etichetta di un campo (o di un filtro): `labels[app.model.campo]`, poi `labelKey` tradotta, poi `label`.
 *
 * @param fullName - `app.model.campo`
 * @param field - campo o filtro con `label` e `labelKey`
 * @param resolver - risolutore delle chiavi
 */
export function fieldLabel(
  fullName: string,
  field: Pick<IAdminField | IAdminFilter, 'label' | 'labelKey'>,
  resolver?: ITextResolver
): string {
  const override = getPachiAdminOptions().labels[fullName]
  if (override !== undefined) return override
  return resolveText(field.labelKey, field.label, resolver)
}

/**
 * Opzioni di un campo `select` con le etichette tradotte da `optionKeys` (`optionKeys[<valore>]`).
 *
 * @param field - campo (o filtro) con `properties.options` e `optionKeys`
 * @param resolver - risolutore delle chiavi
 * @returns le opzioni (copie: lo schema non viene modificato)
 */
export function fieldOptions(
  field: Pick<IAdminField | IAdminFilter, 'properties' | 'optionKeys'>,
  resolver?: ITextResolver
): IAdminOption[] {
  const options = field.properties?.options ?? []
  return options.map((option) => {
    const key = field.optionKeys?.[String(option.value)]
    return key ? { ...option, label: resolveText(key, option.label, resolver) } : option
  })
}

/**
 * Etichetta di un'azione in blocco.
 *
 * @param action - azione dello schema
 * @param resolver - risolutore delle chiavi
 */
export function actionLabel(action: IAdminAction, resolver?: ITextResolver): string {
  return resolveText(action.labelKey, action.label, resolver)
}
