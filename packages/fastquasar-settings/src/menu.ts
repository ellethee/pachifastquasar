import { mdiCog } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'

/** Settings page path (same as `src/routes.ts`). */
export const SETTINGS_PATH = '/user/settings'

/**
 * Context passed by the `@ilpachi/pachifastquasar` shell (local structural type: the package does not import the shell).
 */
export interface IPachiSettingsMenuContext {
  /** vue-i18n translation function. */
  t: (key: string) => string
  /** Resolved shell configuration (only `auth.menu.showSettings` is read). */
  config?: { auth?: { menu?: { showSettings?: boolean } } }
}

/** Menu item compatible with the shell's `IMenuButton`. */
export interface IPachiSettingsMenuItem {
  label: string
  caption: string
  icon: string
  to: string
  order: number
  visible: boolean
}

/**
 * Factory of the "Settings" account menu item (`PachiMenuItemFactory` contract of
 * `@ilpachi/pachifastquasar`, exported as the default of the `menu` module).
 *
 * @param ctx - menu context (`t`, `config`)
 * @returns the Settings item (order 20)
 */
export function getMenuItem(ctx: IPachiSettingsMenuContext): IPachiSettingsMenuItem {
  ensureMessages()
  return {
    label: ctx.t('pachiSettings.menuLabel'),
    caption: ctx.t('pachiSettings.menuCaption'),
    icon: mdiCog,
    to: SETTINGS_PATH,
    order: 20,
    visible: ctx.config?.auth?.menu?.showSettings ?? true,
  }
}

export default getMenuItem
