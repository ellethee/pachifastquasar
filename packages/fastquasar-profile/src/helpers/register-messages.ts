import { getPachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'

/** Parte dell'API globale di vue-i18n usata qui. */
interface I18nGlobal {
  availableLocales: string[]
  te: (key: string, locale: string) => boolean
  mergeLocaleMessage: (locale: string, messages: Record<string, unknown>) => void
}

/**
 * Registra i messaggi del package nell'i18n globale se mancano: la factory del menu gira prima che la
 * pagina (e quindi `usePachiI18n`) sia montata. Non sovrascrive ciò che l'app ha già definito.
 */
export function ensureMessages(): void {
  // tipo ridotto: i tipi completi di vue-i18n qui sono troppo profondi per il compilatore
  const global = getPachiI18n()?.global as I18nGlobal | undefined
  if (!global) return
  for (const [code, tree] of Object.entries(messages)) {
    if (!global.availableLocales.includes(code)) continue
    if (global.te('pachiProfile.menuLabel', code)) continue
    global.mergeLocaleMessage(code, tree)
  }
}
