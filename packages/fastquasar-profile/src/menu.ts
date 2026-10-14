import { mdiAccountCircleOutline } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'

/** Percorso della pagina profilo (stesso di `src/routes.ts`). */
export const PROFILE_PATH = '/user/profile'

/**
 * Contesto passato dalla shell `@ilpachi/pachifastquasar` (tipo strutturale locale: il package non importa la shell).
 */
export interface IPachiProfileMenuContext {
  /** Funzione di traduzione di vue-i18n. */
  t: (key: string) => string
  /** Configurazione risolta della shell (si legge solo `auth.menu.showProfile`). */
  config?: { auth?: { menu?: { showProfile?: boolean } } }
}

/** Voce di menu compatibile con `IMenuButton` della shell. */
export interface IPachiProfileMenuItem {
  label: string
  caption: string
  icon: string
  to: string
  order: number
  visible: boolean
}

/**
 * Factory della voce "Profilo" del menu account (contratto `PachiMenuItemFactory` di
 * `@ilpachi/pachifastquasar`, esportata come default del modulo `menu`).
 *
 * @param ctx - contesto del menu (`t`, `config`)
 * @returns la voce Profilo (ordine 10)
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
