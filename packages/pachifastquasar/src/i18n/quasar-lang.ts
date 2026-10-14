import { Quasar } from 'quasar'
import { quasarLangLoaders } from './quasar-lang-loaders'

/** Preferenze quando il codice non ha un language pack omonimo (es. `en` -> `en-US`). */
const PREFERRED: Record<string, string> = { en: 'en-US', zh: 'zh-CN' }

/**
 * Nome del language pack di Quasar corrispondente a un codice lingua dell'app.
 *
 * @param code - codice lingua dell'app (es. `it`, `en`, `pt-BR`)
 * @returns nome del pack (es. `en-US`) oppure `undefined`
 */
export function findQuasarLang(code: string): string | undefined {
  const names = Object.keys(quasarLangLoaders)
  const lower = (value: string) => value.toLowerCase()
  const base = lower(code).split('-')[0] ?? lower(code)
  const preferred = PREFERRED[base]
  return (
    names.find(name => lower(name) === lower(code)) ??
    names.find(name => lower(name) === base) ??
    (preferred && lower(code) === base ? names.find(name => name === preferred) : undefined) ??
    names.find(name => lower(name).startsWith(`${base}-`))
  )
}

/**
 * Imposta il language pack di Quasar (testi di q-table, q-date, ...) per un codice lingua dell'app.
 * Se Quasar non ha una lingua corrispondente non fa nulla. `<html lang>` resta il codice dell'app.
 *
 * @param code - codice lingua dell'app (es. `it`, `en`, `pt-BR`)
 */
export async function setQuasarLang(code: string): Promise<void> {
  const name = findQuasarLang(code)
  const loader = name ? quasarLangLoaders[name] : undefined
  if (!loader) return
  const mod = await loader()
  Quasar.lang.set(mod.default as never)
  // Quasar riscrive <html lang> con il nome del suo pack (es. `en-US`): si ripristina il codice dell'app
  document.documentElement.lang = code
}
