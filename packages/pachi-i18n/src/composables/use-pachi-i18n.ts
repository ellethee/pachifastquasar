import { useI18n, type Composer } from 'vue-i18n'
import { matchLocale } from '../helper/detect-locale'
import { omitExisting } from '../helper/messages'
import { requirePachiI18n, type PachiI18n } from '../services/i18n-instance'
import type { PachiLocaleMessages, PachiMessageMap } from '../types'

/** Coppie `lingua:namespace` già registrate, per istanza (con `lingua` = codice dell'app). */
const registered = new WeakMap<PachiI18n, Set<string>>()

/**
 * Registra i messaggi di un package nell'istanza globale, una sola volta per lingua e namespace.
 * Si registrano solo le lingue offerte dall'app (quelle già presenti nell'istanza), le altre sono ignorate;
 * per ogni lingua dell'app si sceglie la lingua del package con `matchLocale` (app `en-US` <- package `en`, app `it-IT` <- `it`).
 * Le chiavi già definite dall'app NON vengono sovrascritte. Ad ogni chiamata si rivalutano le lingue dell'istanza:
 * quelle aggiunte a runtime dall'app vengono riempite alla chiamata successiva (non per i componenti già montati).
 *
 * @param messages - messaggi del package per lingua
 */
function registerMessages(messages: PachiMessageMap): void {
  const i18n = requirePachiI18n()
  const done = registered.get(i18n) ?? new Set<string>()
  registered.set(i18n, done)
  const global = i18n.global
  // solo le lingue già presenti nell'istanza (cioè offerte dall'app): il fallback non ne aggiunge di visibili
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
 * Da chiamare in `setup()` di componenti/composable dei package con i PROPRI messaggi
 * (`{ it: { pachiTable2: {...} }, en: {...} }`). Li registra una sola volta nell'i18n globale
 * (senza sovrascrivere ciò che l'app ha già definito) e restituisce `{ t, locale }`.
 *
 * @param messages - messaggi del package per lingua, con un namespace di primo livello
 */
export function usePachiI18n(messages: PachiMessageMap): Pick<Composer, 't' | 'locale'> {
  registerMessages(messages)
  const { t, locale } = useI18n({ useScope: 'global' })
  return { t, locale }
}
