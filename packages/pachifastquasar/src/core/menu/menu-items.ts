import { mdiHome } from '@quasar/extras/mdi-v7'
import type { IMenuButton } from '../components/AccountMenuButton/types/account-menu-button'
import type {
  PachiMenuItemContext,
  PachiMenuItemFactory
} from '../components/AccountMenuButton/types/menu-item-factory'
import { getPachiMenuFactories } from './menu-registry'

/** Ordine di default delle voci senza `order`. */
const DEFAULT_ORDER = 50

/**
 * Voci predefinite della shell: solo Home. Profilo e Impostazioni arrivano dai package
 * (`@ilpachi/fastquasar-profile` / `-settings`) tramite il modulo `menu`.
 *
 * @param ctx - contesto (traduzione e configurazione)
 * @returns voci predefinite
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

/** Valuta una factory in modo sicuro: un errore in un package non rompe il menu. */
function runFactory(factory: PachiMenuItemFactory, ctx: PachiMenuItemContext): IMenuButton[] {
  try {
    const result = factory(ctx)
    if (!result) return []
    return Array.isArray(result) ? result : [result]
  } catch (error) {
    console.error('[menu] errore in una factory di voci di menu', error)
    return []
  }
}

/**
 * Compone le voci del menu account:
 * 1. voci dei package (factory `PachiMenuItemFactory` registrate) e dell'app (`config.menuFactories`);
 * 2. voci predefinite (Home, omessa se un package fornisce la stessa `to`);
 * 3. `config.auth.menu.extraButtons` e `config.menuItems` (array = aggiunte in coda; funzione = trasformazione finale).
 * Il risultato è ordinato per `order` (default 50), a parità l'ordine di inserimento.
 *
 * @param ctx - contesto del menu (`t`, `router`, `config`, `user`)
 * @returns elenco finale di voci (la visibilità e l'esistenza della route sono valutate al rendering)
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
