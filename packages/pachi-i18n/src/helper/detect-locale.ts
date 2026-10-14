/**
 * Cerca tra le lingue disponibili quella che corrisponde a un codice richiesto: prima esatto
 * (senza distinguere maiuscole), poi la lingua base (`it-IT` -> `it`), poi una variante della stessa
 * lingua (`pt` -> `pt-BR`).
 *
 * @param requested - codice richiesto (es. `it-IT`)
 * @param available - codici disponibili
 * @returns il codice disponibile oppure `undefined`
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
 * Rilevamento della lingua iniziale: valore salvato in localStorage, poi `navigator.languages`,
 * poi `defaultLocale`.
 *
 * @param available - codici disponibili
 * @param defaultLocale - lingua di default
 * @param storageKey - chiave localStorage
 */
export function detectLocale(available: readonly string[], defaultLocale: string, storageKey: string): string {
  try {
    const stored = localStorage.getItem(storageKey)
    const match = stored ? matchLocale(stored, available) : undefined
    if (match) return match
  } catch {
    // localStorage non disponibile (SSR, privacy mode): si prosegue
  }
  const languages = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : []
  for (const language of languages) {
    const match = language ? matchLocale(language, available) : undefined
    if (match) return match
  }
  return defaultLocale
}
