import { useI18n, type Composer } from 'vue-i18n'
import { matchLocale } from '../helper/detect-locale'
import { omitExisting } from '../helper/messages'
import { requirePachiI18n, type PachiI18n } from '../services/i18n-instance'
import type { PachiLocaleMessages, PachiMessageMap } from '../types'

/** Already registered `locale:namespace` pairs, per instance (with `locale` = the app's code). */
const registered = new WeakMap<PachiI18n, Set<string>>()

/**
 * Registers a package's messages in the global instance, only once per locale and namespace.
 * Only the locales offered by the app (those already present in the instance) are registered, the others are ignored;
 * for each app locale the package locale is chosen with `matchLocale` (app `en-US` <- package `en`, app `it-IT` <- `it`).
 * Keys already defined by the app are NOT overwritten. On every call the instance locales are re-evaluated:
 * those added at runtime by the app are filled on the next call (not for already mounted components).
 *
 * @param messages - package messages per locale
 */
function registerMessages(messages: PachiMessageMap): void {
  const i18n = requirePachiI18n()
  const done = registered.get(i18n) ?? new Set<string>()
  registered.set(i18n, done)
  const global = i18n.global
  // only locales already present in the instance (i.e. offered by the app): the fallback adds no visible ones
  const packageCodes = Object.keys(messages)

  for (const code of global.availableLocales) {
    const source = matchLocale(code, packageCodes)
    const tree = source ? messages[source] : undefined
    if (!tree) continue
    const fresh: PachiLocaleMessages = {}
    for (const [namespace, value] of Object.entries(tree)) {
      const tag = `${code}:${namespace}`
      if (done.has(tag)) continue
      done.add(tag)
      fresh[namespace] = value
    }
    if (Object.keys(fresh).length === 0) continue
    const missing = omitExisting(fresh, global.getLocaleMessage(code) as PachiLocaleMessages)
    if (Object.keys(missing).length > 0) global.mergeLocaleMessage(code, missing as never)
  }
}

/**
 * To be called in `setup()` of package components/composables with their OWN messages
 * (`{ it: { pachiTable2: {...} }, en: {...} }`). Registers them once in the global i18n
 * (without overwriting what the app has already defined) and returns `{ t, locale }`.
 *
 * @param messages - package messages per locale, with a top-level namespace
 */
export function usePachiI18n(messages: PachiMessageMap): Pick<Composer, 't' | 'locale'> {
  registerMessages(messages)
  const { t, locale } = useI18n({ useScope: 'global' })
  return { t, locale }
}
