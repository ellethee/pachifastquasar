import { getPachiI18n, pachiT } from '@ilpachi/pachi-i18n'
import type { IAdminAction, IAdminField, IAdminFilter, IAdminOption } from '../types/admin'
import { getPachiAdminOptions } from './options'

/** Message key resolver (injectable for tests). */
export interface ITextResolver {
  /** `true` if the key exists in the current language. */
  te: (key: string) => boolean
  /** Translates the key. */
  t: (key: string) => string
}

/** Default resolver: global i18n of `@ilpachi/pachi-i18n`. */
export const defaultResolver: ITextResolver = {
  te: (key) => {
    // `te` with a dynamic key: avoids the recursive typing of the messages schema
    const global = getPachiI18n()?.global as unknown as { te: (key: string) => boolean } | undefined
    return global?.te(key) ?? false
  },
  t: (key) => pachiT(key),
}

/**
 * Text of a backend key. Order: `labels` from the options (by key), app translation, `fallback`
 * (text already present in the schema, translated by the backend or in English).
 *
 * @param key - backend key (`titleKey`, `labelKey`, value of `optionKeys`)
 * @param fallback - schema text
 * @param resolver - key resolver (default: global i18n)
 * @param labels - replacements by key (default: `labels` from the options)
 * @returns the text to show
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
 * Title of a model.
 *
 * @param model - object with `title` and `titleKey` (model list or schema)
 * @param resolver - key resolver
 */
export function modelTitle(
  model: { title: string, titleKey?: string | undefined },
  resolver?: ITextResolver
): string {
  return resolveText(model.titleKey, model.title, resolver)
}

/**
 * Label of a field (or filter): `labels[app.model.field]`, then translated `labelKey`, then `label`.
 *
 * @param fullName - `app.model.field`
 * @param field - field or filter with `label` and `labelKey`
 * @param resolver - key resolver
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
 * Options of a `select` field with labels translated from `optionKeys` (`optionKeys[<value>]`).
 *
 * @param field - field (or filter) with `properties.options` and `optionKeys`
 * @param resolver - key resolver
 * @returns the options (copies: the schema is not modified)
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
 * Label of a bulk action.
 *
 * @param action - schema action
 * @param resolver - key resolver
 */
export function actionLabel(action: IAdminAction, resolver?: ITextResolver): string {
  return resolveText(action.labelKey, action.label, resolver)
}
