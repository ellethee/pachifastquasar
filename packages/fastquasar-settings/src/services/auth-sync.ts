import { watch, type App } from 'vue'
import { getPachiI18n } from '@ilpachi/pachi-i18n'
import { setPachiSettingsOptions, getPachiSettingsOptions } from '../helpers/http'
import type { IPachiSettingsOptions } from '../helpers/http'
import { setQuasarInstance } from '../helpers/quasar-instance'
import { applyLegacyLocalPrefs, getLastAppliedLocale } from './appliers'
import { SettingsManager, userKeyOf } from './settings-manager'

/** Evento di finestra emesso dalla shell quando cambia l'utente autenticato (dettaglio: {@link IAuthChangedDetail}). */
export const AUTH_CHANGED_EVENT = 'pachi:auth-changed'
/** Evento di finestra emesso dalla shell quando l'utente cambia il tema dalla barra (dettaglio: `{ theme }`). */
export const THEME_CHANGED_EVENT = 'pachi:theme-changed'

/** Dettaglio di `pachi:auth-changed`. */
export interface IAuthChangedDetail {
  authenticated: boolean
  userId?: string | null
  username?: string | null
}

/** Opzioni di {@link installPachiSettings}. */
export interface IInstallPachiSettingsOptions extends IPachiSettingsOptions {
  /**
   * App Vue (`ctx.app` del boot): da lì si ricava `$q`.
   */
  app?: App
}

/** Funzione che annulla l'installazione precedente. */
let uninstallPrevious: (() => void) | null = null

/**
 * Gestisce un evento di cambio utente: con una sessione valida carica le impostazioni (e applica la cache
 * dell'utente), senza sessione le svuota. Esportata per i test.
 *
 * @param detail - dettaglio di `pachi:auth-changed`
 */
export async function handleAuthChanged(detail: IAuthChangedDetail | null | undefined): Promise<void> {
  const manager = SettingsManager.getInstance()
  const key = detail?.authenticated ? userKeyOf({ id: detail.userId, username: detail.username }) : null
  if (key) await manager.activateUser(key)
  else manager.deactivateUser()
}

/**
 * Gestisce il cambio di tema fatto dall'utente fuori dalla pagina (pulsante della barra): se c'è un campo con
 * applier `theme` lo salva sul backend. Esportata per i test.
 *
 * @param theme - `dark` o `light`
 */
export function handleThemeChanged(theme: unknown): void {
  if (theme === 'dark' || theme === 'light' || theme === 'auto') SettingsManager.getInstance().setByApply('theme', theme)
}

/**
 * Gestisce il cambio di lingua (selettore della barra): se la lingua non è quella appena impostata dall'applier
 * la salva sul backend (campo con applier `locale`). Esportata per i test.
 *
 * @param code - codice lingua attivo
 */
export function handleLocaleChanged(code: string): void {
  if (code === getLastAppliedLocale()) return
  SettingsManager.getInstance().setByApply('locale', code)
}

/**
 * Installa l'integrazione del package con l'app. Da chiamare una volta nel boot, dopo `createPachiApp`:
 *
 * ```ts
 * installPachiSettings({ app: ctx.app, getUser: () => AuthManager.getInstance().userInfo })
 * ```
 *
 * - ascolta `pachi:auth-changed` (emesso dalla shell `@ilpachi/pachifastquasar` a login, ripristino sessione,
 *   cambio utente e logout): carica le impostazioni (anche se la pagina non è mai aperta) o le svuota;
 * - applica subito la cache dell'utente corrente (se `getUser` lo fornisce) e le preferenze locali storiche;
 * - ascolta `pachi:theme-changed` e la lingua di `@ilpachi/pachi-i18n` per salvare sul backend le modifiche fatte
 *   fuori dalla pagina impostazioni.
 *
 * Il package non importa la shell: comunica solo con questi eventi. Una seconda chiamata sostituisce la prima.
 *
 * @param options - opzioni del package (`getHttp`, `isAuthenticated`, `getUser`, ...) e `app`
 * @returns funzione che rimuove gli ascoltatori
 */
export function installPachiSettings(options: IInstallPachiSettingsOptions = {}): () => void {
  uninstallPrevious?.()
  const { app, ...rest } = options
  if (app) setQuasarInstance(app.config.globalProperties.$q)
  setPachiSettingsOptions(rest)
  const manager = SettingsManager.getInstance()

  applyLegacyLocalPrefs()
  const key = userKeyOf(getPachiSettingsOptions().getUser?.())
  if (key) manager.primeUser(key)

  const onAuth = (e: Event): void => void handleAuthChanged((e as CustomEvent<IAuthChangedDetail>).detail)
  const onTheme = (e: Event): void => handleThemeChanged((e as CustomEvent<{ theme?: unknown }>).detail?.theme)
  window.addEventListener(AUTH_CHANGED_EVENT, onAuth)
  window.addEventListener(THEME_CHANGED_EVENT, onTheme)
  const i18n = getPachiI18n()
  const stopLocale = i18n ? watch(i18n.global.locale, (code) => handleLocaleChanged(code)) : null

  uninstallPrevious = () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, onAuth)
    window.removeEventListener(THEME_CHANGED_EVENT, onTheme)
    stopLocale?.()
    uninstallPrevious = null
  }
  return uninstallPrevious
}
