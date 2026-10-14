import { mdiCog } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'

/** Percorso della pagina impostazioni (stesso di `src/routes.ts`). */
export const SETTINGS_PATH = '/user/settings'

/**
 * Contesto passato dalla shell `@ilpachi/pachifastquasar` (tipo strutturale locale: il package non importa la shell).
 */
export interface IPachiSettingsMenuContext {
  /** Funzione di traduzione di vue-i18n. */
  t: (key: string) => string
  /** Configurazione risolta della shell (si legge solo `auth.menu.showSettings`). */
  config?: { auth?: { menu?: { showSettings?: boolean } } }
}

/** Voce di menu compatibile con `IMenuButton` della shell. */
export interface IPachiSettingsMenuItem {
  label: string
  caption: string
  icon: string
  to: string
  order: number
  visible: boolean
}

/**
 * Factory della voce "Impostazioni" del menu account (contratto `PachiMenuItemFactory` di
 * `@ilpachi/pachifastquasar`, esportata come default del modulo `menu`).
 *
 * @param ctx - contesto del menu (`t`, `config`)
 * @returns la voce Impostazioni (ordine 20)
 */
export function getMenuItem(ctx: IPachiSettingsMenuContext): IPachiSettingsMenuItem {
  ensureMessages()
  return {
    label: ctx.t('pachiSettings.menuLabel'),
    caption: ctx.t('pachiSettings.menuCaption'),
    icon: mdiCog,
    to: SETTINGS_PATH,
    order: 20,
    visible: ctx.config?.auth?.menu?.showSettings ?? true,
  }
}

export default getMenuItem
