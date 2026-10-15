import { mdiHome } from '@quasar/extras/mdi-v7'
import type { IMenuButton } from '../components/AccountMenuButton/types/account-menu-button'
import type {
  PachiMenuItemContext,
  PachiMenuItemFactory
} from '../components/AccountMenuButton/types/menu-item-factory'
import { getPachiMenuFactories } from './menu-registry'

/** Default order of items without `order`. */
const DEFAULT_ORDER = 50

/**
 * Default shell items: Home only. Profile and Settings come from the packages
 * (`@ilpachi/fastquasar-profile` / `-settings`) through the `menu` module.
 *
 * @param ctx - context (translation and configuration)
 * @returns default items
 */
export function createDefaultButtons(ctx: Pick<PachiMenuItemContext, 't' | 'config'>): IMenuButton[] {
  const { t, config } = ctx
  return [
    {
      label: t('menu.home'),
      to: '/',
      icon: mdiHome,
      caption: t('menu.homeCaption'),
      visible: config.auth.menu.showHome,
      order: 90
    }
  ]
}

/** Safely evaluates a factory: an error in a package does not break the menu. */
function runFactory(factory: PachiMenuItemFactory, ctx: PachiMenuItemContext): IMenuButton[] {
  try {
    const result = factory(ctx)
    if (!result) return []
    return Array.isArray(result) ? result : [result]
  } catch (error) {
    console.error('[menu] error in a menu item factory', error)
    return []
  }
}

/**
 * Composes the account menu items:
 * 1. items from packages (registered `PachiMenuItemFactory` factories) and the app (`config.menuFactories`);
 * 2. default items (Home, omitted if a package provides the same `to`);
 * 3. `config.auth.menu.extraButtons` and `config.menuItems` (array = appended at the end; function = final transformation).
 * The result is sorted by `order` (default 50), ties keep insertion order.
 *
 * @param ctx - menu context (`t`, `router`, `config`, `user`)
 * @returns final list of items (visibility and route existence are evaluated at render time)
 */
export function buildMenuItems(ctx: PachiMenuItemContext): IMenuButton[] {
  const { config } = ctx
  const factories = [...getPachiMenuFactories(), ...(config.menuFactories ?? [])]
  const fromFactories = factories.flatMap(factory => runFactory(factory, ctx))
  const provided = new Set(fromFactories.map(item => item.to).filter(Boolean))
  const defaults = createDefaultButtons(ctx).filter(item => !item.to || !provided.has(item.to))

  let items: IMenuButton[] = [...fromFactories, ...defaults, ...(config.auth.menu.extraButtons ?? [])]
  const custom = config.menuItems
  if (Array.isArray(custom)) items = [...items, ...custom]

  items = items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        (a.item.order ?? DEFAULT_ORDER) - (b.item.order ?? DEFAULT_ORDER) || a.index - b.index
    )
    .map(({ item }) => item)

  return typeof custom === 'function' ? custom(items) : items
}
