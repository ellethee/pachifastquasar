/**
 * Eventi di finestra con cui la shell avvisa i package `@ilpachi/*` senza che questi la importino
 * (es. `@ilpachi/fastquasar-settings` carica le impostazioni al login e le svuota al logout).
 */

/** Evento emesso quando cambia l'utente autenticato (login, ripristino della sessione, cambio utente, logout). */
export const PACHI_AUTH_CHANGED_EVENT = 'pachi:auth-changed'

/** Evento emesso quando il tema è cambiato dall'utente tramite `ToggleThemeButton`. */
export const PACHI_THEME_CHANGED_EVENT = 'pachi:theme-changed'

/** Dettaglio di {@link PACHI_AUTH_CHANGED_EVENT}. */
export interface PachiAuthChangedDetail {
  /** `true` con una sessione valida. */
  authenticated: boolean
  /** Identificativo stabile dell'utente (UUID), `null` al logout. */
  userId: string | null
  /** Nome utente, `null` al logout. */
  username: string | null
}

/** Dettaglio di {@link PACHI_THEME_CHANGED_EVENT}. */
export interface PachiThemeChangedDetail {
  /** Tema scelto. */
  theme: 'dark' | 'light'
}

/** Ultimo identificativo notificato (`undefined` = mai): evita eventi duplicati a ogni refresh dell'utente. */
let lastNotified: string | null | undefined

/**
 * Emette un `CustomEvent` su `window` (no-op fuori dal browser).
 *
 * @param type - nome dell'evento
 * @param detail - dettaglio
 */
function dispatch<T>(type: string, detail: T): void {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return
  window.dispatchEvent(new CustomEvent<T>(type, { detail }))
}

/**
 * Notifica il cambio di utente autenticato. Emette solo se l'identità è cambiata rispetto all'ultima notifica
 * (un refresh del token o dei dati dell'utente non produce eventi).
 *
 * @param user - utente corrente (`null` senza sessione)
 * @param force - emette comunque (es. all'avvio, quando un package potrebbe essersi iscritto dopo)
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
 * Notifica che il tema è stato cambiato dall'utente.
 *
 * @param theme - nuovo tema
 */
export function notifyPachiThemeChanged(theme: 'dark' | 'light'): void {
  dispatch<PachiThemeChangedDetail>(PACHI_THEME_CHANGED_EVENT, { theme })
}

/** Azzera la memoria dell'ultima notifica (per i test). */
export function resetPachiAuthNotification(): void {
  lastNotified = undefined
}
