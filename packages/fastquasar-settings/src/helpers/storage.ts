/**
 * Accesso difensivo a `localStorage` (assente in test/SSR, bloccato in modalità privata): gli errori sono ignorati.
 */

/** Legge una chiave (o `null` se assente o non leggibile). */
export function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** Scrive una chiave (no-op se lo storage non è disponibile). */
export function writeStorage(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value)
  } catch {
    // storage non disponibile: la preferenza vale solo per la sessione
  }
}

/** Rimuove una chiave (no-op se lo storage non è disponibile). */
export function removeStorage(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key)
  } catch {
    // storage non disponibile
  }
}
