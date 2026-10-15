/**
 * Defensive access to `localStorage` (absent in tests/SSR, blocked in private mode): errors are ignored.
 */

/** Reads a key (or `null` if absent or unreadable). */
export function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** Writes a key (no-op if storage is unavailable). */
export function writeStorage(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value)
  } catch {
    // storage unavailable: the preference only lasts for the session
  }
}

/** Removes a key (no-op if storage is unavailable). */
export function removeStorage(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key)
  } catch {
    // storage unavailable
  }
}
