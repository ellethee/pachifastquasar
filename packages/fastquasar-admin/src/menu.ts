import { mdiShieldAccountOutline } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'
import { hasAdminModels } from './helpers/models-state'

/** Path of the Admin page (same as `src/routes.ts`). */
export const ADMIN_PATH = '/admin'

/**
 * Context passed by the `@ilpachi/pachifastquasar` shell (local structural type: the package does not import the shell).
 */
export interface IPachiAdminMenuContext {
  /** vue-i18n translation function. */
  t: (key: string) => string
}

/** Menu item compatible with the shell `IMenuButton`. */
export interface IPachiAdminMenuItem {
  label: string
  caption: string
  icon: string
  to: string
  order: number
  /** Evaluated at render time: true only if the user sees at least one model. */
  visible: () => boolean
}

/**
 * Factory of the "Admin" account menu item (`PachiMenuItemFactory` contract of
 * `@ilpachi/pachifastquasar`, exported as the default of the `menu` module). The item is visible only if
 * `GET /admin/models` returns at least one visible model; missing permissions (403), 401 or network errors hide it
 * silently. Requires `installPachiAdmin` in the boot to load the models outside the page.
 *
 * @param ctx - menu context (`t`)
 * @returns the Admin item (order 30)
 */
export function getMenuItem(ctx: IPachiAdminMenuContext): IPachiAdminMenuItem {
  ensureMessages()
  return {
    label: ctx.t('pachiAdmin.menuLabel'),
    caption: ctx.t('pachiAdmin.menuCaption'),
    icon: mdiShieldAccountOutline,
    to: ADMIN_PATH,
    order: 30,
    visible: hasAdminModels,
  }
}

export default getMenuItem
