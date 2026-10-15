import { Quasar } from 'quasar'
import { quasarLangLoaders } from './quasar-lang-loaders'

/** Preferences when the code has no language pack with the same name (e.g. `en` -> `en-US`). */
const PREFERRED: Record<string, string> = { en: 'en-US', zh: 'zh-CN' }

/**
 * Name of the Quasar language pack matching an app language code.
 *
 * @param code - app language code (e.g. `it`, `en`, `pt-BR`)
 * @returns pack name (e.g. `en-US`) or `undefined`
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
 * Sets the Quasar language pack (q-table, q-date, ... texts) for an app language code.
 * Does nothing if Quasar has no matching language. `<html lang>` stays the app code.
 *
 * @param code - app language code (e.g. `it`, `en`, `pt-BR`)
 */
export async function setQuasarLang(code: string): Promise<void> {
  const name = findQuasarLang(code)
  const loader = name ? quasarLangLoaders[name] : undefined
  if (!loader) return
  const mod = await loader()
  Quasar.lang.set(mod.default as never)
  // Quasar rewrites <html lang> with the name of its pack (e.g. `en-US`): restore the app code
  document.documentElement.lang = code
}
