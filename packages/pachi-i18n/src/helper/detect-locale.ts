/**
 * Looks among the available locales for the one matching a requested code: first exact
 * (case-insensitive), then the base language (`it-IT` -> `it`), then a variant of the same
 * language (`pt` -> `pt-BR`).
 *
 * @param requested - requested code (e.g. `it-IT`)
 * @param available - available codes
 * @returns the available code or `undefined`
 */
export function matchLocale(requested: string, available: readonly string[]): string | undefined {
  const wanted = requested.toLowerCase()
  const base = wanted.split('-')[0] ?? wanted
  return (
    available.find((code) => code.toLowerCase() === wanted) ??
    available.find((code) => code.toLowerCase() === base) ??
    available.find((code) => code.toLowerCase().startsWith(`${base}-`))
  )
}

/**
 * Initial locale detection: value saved in localStorage, then `navigator.languages`,
 * then `defaultLocale`.
 *
 * @param available - available codes
 * @param defaultLocale - default locale
 * @param storageKey - localStorage key
 */
export function detectLocale(available: readonly string[], defaultLocale: string, storageKey: string): string {
  try {
    const stored = localStorage.getItem(storageKey)
    const match = stored ? matchLocale(stored, available) : undefined
    if (match) return match
  } catch {
    // localStorage unavailable (SSR, privacy mode): carry on
  }
  const languages = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : []
  for (const language of languages) {
    const match = language ? matchLocale(language, available) : undefined
    if (match) return match
  }
  return defaultLocale
}
