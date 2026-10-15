/**
 * Window events used by the shell to notify the `@ilpachi/*` packages without them importing it
 * (e.g. `@ilpachi/fastquasar-settings` loads the settings at login and clears them at logout).
 */

/** Event emitted when the authenticated user changes (login, session restore, user switch, logout). */
export const PACHI_AUTH_CHANGED_EVENT = 'pachi:auth-changed'

/** Event emitted when the user changes the theme through `ToggleThemeButton`. */
export const PACHI_THEME_CHANGED_EVENT = 'pachi:theme-changed'

/** Detail of {@link PACHI_AUTH_CHANGED_EVENT}. */
export interface PachiAuthChangedDetail {
  /** `true` with a valid session. */
  authenticated: boolean
  /** Stable user identifier (UUID), `null` at logout. */
  userId: string | null
  /** Username, `null` at logout. */
  username: string | null
}

/** Detail of {@link PACHI_THEME_CHANGED_EVENT}. */
export interface PachiThemeChangedDetail {
  /** Chosen theme. */
  theme: 'dark' | 'light'
}

/** Last notified identifier (`undefined` = never): avoids duplicate events on every user refresh. */
let lastNotified: string | null | undefined

/**
 * Emits a `CustomEvent` on `window` (no-op outside the browser).
 *
 * @param type - event name
 * @param detail - detail
 */
function dispatch<T>(type: string, detail: T): void {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return
  window.dispatchEvent(new CustomEvent<T>(type, { detail }))
}

/**
 * Notifies the change of authenticated user. Emits only if the identity changed since the last notification
 * (a token or user data refresh produces no events).
 *
 * @param user - current user (`null` without a session)
 * @param force - emit anyway (e.g. at startup, when a package may have subscribed later)
 */
export function notifyPachiAuthChanged(
  user: { id?: string | null; username?: string | null } | null,
  force = false
): void {
  const id = user ? (user.id ?? user.username ?? null) : null
  if (!force && id === lastNotified) return
  lastNotified = id
  dispatch<PachiAuthChangedDetail>(PACHI_AUTH_CHANGED_EVENT, {
    authenticated: id !== null,
    userId: id,
    username: user?.username ?? null
  })
}

/**
 * Notifies that the theme was changed by the user.
 *
 * @param theme - new theme
 */
export function notifyPachiThemeChanged(theme: 'dark' | 'light'): void {
  dispatch<PachiThemeChangedDetail>(PACHI_THEME_CHANGED_EVENT, { theme })
}

/** Resets the memory of the last notification (for tests). */
export function resetPachiAuthNotification(): void {
  lastNotified = undefined
}
