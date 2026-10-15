import type { Router } from 'vue-router'
import type { IMenuButton } from './account-menu-button'
import type { IAppConfig } from '../../../config/types/app-config'
import type { IUserInfo } from '../../../../services/auth-manager/types/auth-manager'

/** Context passed to {@link PachiMenuItemFactory}. */
export interface PachiMenuItemContext {
  /** vue-i18n translation function (reactive to language changes if the factory is called inside a `computed`). */
  t: (key: string, params?: Record<string, unknown>) => string
  router: Router
  config: IAppConfig
  /** Authenticated user (absent if not yet available or with auth disabled). */
  user?: IUserInfo | null
}

/** Account menu item. Same type as the default items. */
export type PachiMenuItem = IMenuButton

/**
 * Contract that an `@ilpachi/*` package implements to add items to the account menu: a `menu` module
 * (`menu.ts`/`menu.js` next to `routes`, or `dist/menu.js`) with a `export default` of this function.
 * The shell calls it (inside a `computed`) on every language/user change and accepts an item, an array or `null`.
 */
export type PachiMenuItemFactory = (
  ctx: PachiMenuItemContext
) => PachiMenuItem | PachiMenuItem[] | null | undefined
