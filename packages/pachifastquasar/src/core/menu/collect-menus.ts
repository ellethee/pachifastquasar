import type { PachiMenuItemFactory } from '../components/AccountMenuButton/types/menu-item-factory'
import { enabledPackageEntries } from '../../router/routes-finder'
import type { PachiGlob } from '../../router/routes-finder'
import type { PachiEnv } from '../config'

/**
 * Menu item factories exported by the `@ilpachi/*` packages (default export of `menu`), honoring
 * `ilpachi-<package>-disable-route`.
 *
 * @param glob - result of the glob of the packages' `menu` modules
 * @param env - environment variables
 * @returns the factories (functions) found
 */
export function collectPackageMenus(glob: PachiGlob, env: PachiEnv = {}): PachiMenuItemFactory[] {
  return enabledPackageEntries(glob, env)
    .map(([, factory]) => factory)
    .filter((factory): factory is PachiMenuItemFactory => typeof factory === 'function')
}
