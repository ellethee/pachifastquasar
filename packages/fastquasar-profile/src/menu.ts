import { mdiAccountCircleOutline } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'

/** Profile page path (same as `src/routes.ts`). */
export const PROFILE_PATH = '/user/profile'

/**
 * Context passed by the `@ilpachi/pachifastquasar` shell (local structural type: the package does not import the shell).
 */
export interface IPachiProfileMenuContext {
  /** vue-i18n translation function. */
  t: (key: string) => string
  /** Resolved shell configuration (only `auth.menu.showProfile` is read). */
  config?: { auth?: { menu?: { showProfile?: boolean } } }
}

/** Menu item compatible with the shell's `IMenuButton`. */
export interface IPachiProfileMenuItem {
  label: string
  caption: string
  icon: string
  to: string
  order: number
  visible: boolean
}

/**
 * Factory of the "Profile" account menu item (`PachiMenuItemFactory` contract of
 * `@ilpachi/pachifastquasar`, exported as the default of the `menu` module).
 *
 * @param ctx - menu context (`t`, `config`)
 * @returns the Profile item (order 10)
 */
export function getMenuItem(ctx: IPachiProfileMenuContext): IPachiProfileMenuItem {
  ensureMessages()
  return {
    label: ctx.t('pachiProfile.menuLabel'),
    caption: ctx.t('pachiProfile.menuCaption'),
    icon: mdiAccountCircleOutline,
    to: PROFILE_PATH,
    order: 10,
    visible: ctx.config?.auth?.menu?.showProfile ?? true,
  }
}

export default getMenuItem
