import type { Router } from 'vue-router'
import type { IMenuButton } from './account-menu-button'
import type { IAppConfig } from '../../../config/types/app-config'
import type { IUserInfo } from '../../../../services/auth-manager/types/auth-manager'

/** Contesto passato a {@link PachiMenuItemFactory}. */
export interface PachiMenuItemContext {
  /** Funzione di traduzione di vue-i18n (reattiva al cambio lingua se la factory è richiamata in un `computed`). */
  t: (key: string, params?: Record<string, unknown>) => string
  router: Router
  config: IAppConfig
  /** Utente autenticato (assente se non ancora disponibile o con auth disabilitata). */
  user?: IUserInfo | null
}

/** Voce del menu account. Stesso tipo delle voci predefinite. */
export type PachiMenuItem = IMenuButton

/**
 * Contratto che un package `@ilpachi/*` implementa per aggiungere voci al menu account: un modulo `menu`
 * (`menu.ts`/`menu.js` accanto a `routes`, oppure `dist/menu.js`) con `export default` di questa funzione.
 * La shell la richiama (dentro un `computed`) ad ogni cambio lingua/utente e accetta una voce, un array o `null`.
 */
export type PachiMenuItemFactory = (
  ctx: PachiMenuItemContext
) => PachiMenuItem | PachiMenuItem[] | null | undefined
