import { watch, type App } from 'vue'
import { getPachiI18n } from '@ilpachi/pachi-i18n'
import { setPachiSettingsOptions, getPachiSettingsOptions } from '../helpers/http'
import type { IPachiSettingsOptions } from '../helpers/http'
import { setQuasarInstance } from '../helpers/quasar-instance'
import { applyLegacyLocalPrefs, getLastAppliedLocale } from './appliers'
import { SettingsManager, userKeyOf } from './settings-manager'

/** Window event emitted by the shell when the authenticated user changes (detail: {@link IAuthChangedDetail}). */
export const AUTH_CHANGED_EVENT = 'pachi:auth-changed'
/** Window event emitted by the shell when the user changes the theme from the toolbar (detail: `{ theme }`). */
export const THEME_CHANGED_EVENT = 'pachi:theme-changed'

/** Detail of `pachi:auth-changed`. */
export interface IAuthChangedDetail {
  authenticated: boolean
  userId?: string | null
  username?: string | null
}

/** Options of {@link installPachiSettings}. */
export interface IInstallPachiSettingsOptions extends IPachiSettingsOptions {
  /**
   * Vue app (`ctx.app` of the boot): `$q` is taken from it.
   */
  app?: App
}

/** Function that undoes the previous installation. */
let uninstallPrevious: (() => void) | null = null

/**
 * Handles a user-change event: with a valid session it loads the settings (and applies the
 * user's cache), without a session it clears them. Exported for tests.
 *
 * @param detail - detail of `pachi:auth-changed`
 */
export async function handleAuthChanged(detail: IAuthChangedDetail | null | undefined): Promise<void> {
  const manager = SettingsManager.getInstance()
  const key = detail?.authenticated ? userKeyOf({ id: detail.userId, username: detail.username }) : null
  if (key) await manager.activateUser(key)
  else manager.deactivateUser()
}

/**
 * Handles a theme change made by the user outside the page (toolbar button): if there is a field with a
 * `theme` applier it saves it to the backend. Exported for tests.
 *
 * @param theme - `dark` or `light`
 */
export function handleThemeChanged(theme: unknown): void {
  if (theme === 'dark' || theme === 'light' || theme === 'auto') SettingsManager.getInstance().setByApply('theme', theme)
}

/**
 * Handles a language change (toolbar selector): if the language is not the one just set by the applier
 * it saves it to the backend (field with a `locale` applier). Exported for tests.
 *
 * @param code - active language code
 */
export function handleLocaleChanged(code: string): void {
  if (code === getLastAppliedLocale()) return
  SettingsManager.getInstance().setByApply('locale', code)
}

/**
 * Installs the package integration with the app. Call once in the boot, after `createPachiApp`:
 *
 * ```ts
 * installPachiSettings({ app: ctx.app, getUser: () => AuthManager.getInstance().userInfo })
 * ```
 *
 * - listens to `pachi:auth-changed` (emitted by the `@ilpachi/pachifastquasar` shell on login, session restore,
 *   user change and logout): loads the settings (even if the page was never opened) or clears them;
 * - immediately applies the current user's cache (if `getUser` provides it) and the legacy local preferences;
 * - listens to `pachi:theme-changed` and the `@ilpachi/pachi-i18n` language to save to the backend the changes made
 *   outside the settings page.
 *
 * The package does not import the shell: it only communicates through these events. A second call replaces the first.
 *
 * @param options - package options (`getHttp`, `isAuthenticated`, `getUser`, ...) and `app`
 * @returns function that removes the listeners
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
