import type { PachiMenuItemFactory } from '../components/AccountMenuButton/types/menu-item-factory'

let factories: PachiMenuItemFactory[] = []

/**
 * Registra le factory di voci di menu scoperte nei package (sostituisce l'elenco precedente).
 *
 * @param list - factory dei package
 */
export function registerPachiMenus(list: PachiMenuItemFactory[]): void {
  factories = [...list]
}

/**
 * Factory di voci di menu registrate dai package.
 *
 * @returns elenco (copia)
 */
export function getPachiMenuFactories(): PachiMenuItemFactory[] {
  return [...factories]
}
