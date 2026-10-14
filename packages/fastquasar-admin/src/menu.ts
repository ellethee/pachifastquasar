import { mdiShieldAccountOutline } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'
import { hasAdminModels } from './helpers/models-state'

/** Percorso della pagina Admin (stesso di `src/routes.ts`). */
export const ADMIN_PATH = '/admin'

/**
 * Contesto passato dalla shell `@ilpachi/pachifastquasar` (tipo strutturale locale: il package non importa la shell).
 */
export interface IPachiAdminMenuContext {
  /** Funzione di traduzione di vue-i18n. */
  t: (key: string) => string
}

/** Voce di menu compatibile con `IMenuButton` della shell. */
export interface IPachiAdminMenuItem {
  label: string
  caption: string
  icon: string
  to: string
  order: number
  /** Valutata al rendering: vera solo se l'utente vede almeno un modello. */
  visible: () => boolean
}

/**
 * Factory della voce "Admin" del menu account (contratto `PachiMenuItemFactory` di
 * `@ilpachi/pachifastquasar`, esportata come default del modulo `menu`). La voce è visibile solo se
 * `GET /admin/models` restituisce almeno un modello visibile; assenza di permessi (403), 401 o rete la nascondono
 * in silenzio. Richiede `installPachiAdmin` nel boot per caricare i modelli fuori dalla pagina.
 *
 * @param ctx - contesto del menu (`t`)
 * @returns la voce Admin (ordine 30)
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
