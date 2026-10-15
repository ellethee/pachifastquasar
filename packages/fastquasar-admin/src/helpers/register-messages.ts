import { getPachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'

/** Part of the vue-i18n global API used here. */
interface I18nGlobal {
  availableLocales: string[]
  te: (key: string, locale: string) => boolean
  mergeLocaleMessage: (locale: string, messages: Record<string, unknown>) => void
}

/**
 * Registers the package messages in the global i18n if missing: the menu factory runs before the
 * page (and therefore `usePachiI18n`) is mounted. It does not overwrite what the app has already defined.
 */
export function ensureMessages(): void {
  // reduced type: the full vue-i18n types are too deep for the compiler here
  const global = getPachiI18n()?.global as I18nGlobal | undefined
  if (!global) return
  for (const [code, tree] of Object.entries(messages)) {
    if (!global.availableLocales.includes(code)) continue
    if (global.te('pachiAdmin.menuLabel', code)) continue
    global.mergeLocaleMessage(code, tree)
  }
}
