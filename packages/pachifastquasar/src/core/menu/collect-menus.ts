import type { PachiMenuItemFactory } from '../components/AccountMenuButton/types/menu-item-factory'
import { enabledPackageEntries } from '../../router/routes-finder'
import type { PachiGlob } from '../../router/routes-finder'
import type { PachiEnv } from '../config'

/**
 * Factory di voci di menu esportate dai package `@ilpachi/*` (default export di `menu`), rispettando
 * `ilpachi-<package>-disable-route`.
 *
 * @param glob - risultato del glob dei `menu` dei package
 * @param env - variabili d'ambiente
 * @returns le factory (funzioni) trovate
 */
export function collectPackageMenus(glob: PachiGlob, env: PachiEnv = {}): PachiMenuItemFactory[] {
  return enabledPackageEntries(glob, env)
    .map(([, factory]) => factory)
    .filter((factory): factory is PachiMenuItemFactory => typeof factory === 'function')
}
