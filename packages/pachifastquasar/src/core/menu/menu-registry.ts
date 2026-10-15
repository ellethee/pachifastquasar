import type { PachiMenuItemFactory } from '../components/AccountMenuButton/types/menu-item-factory'

let factories: PachiMenuItemFactory[] = []

/**
 * Registers the menu item factories discovered in packages (replaces the previous list).
 *
 * @param list - package factories
 */
export function registerPachiMenus(list: PachiMenuItemFactory[]): void {
  factories = [...list]
}

/**
 * Menu item factories registered by packages.
 *
 * @returns list (copy)
 */
export function getPachiMenuFactories(): PachiMenuItemFactory[] {
  return [...factories]
}
