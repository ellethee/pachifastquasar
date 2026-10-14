import type { App } from 'vue'
import { setPachiAdminOptions } from '../helpers/options'
import type { IPachiAdminOptions } from '../helpers/options'
import { hasRequestedAdminModels, loadAdminModels, resetAdminModels } from '../helpers/models-state'

/** Evento di finestra emesso dalla shell quando cambia l'utente autenticato. */
export const AUTH_CHANGED_EVENT = 'pachi:auth-changed'

/** Opzioni di {@link installPachiAdmin}. */
export interface IInstallPachiAdminOptions extends IPachiAdminOptions {
  /**
   * App Vue (`ctx.app` del boot). Non più necessaria per il client HTTP (che arriva dall'istanza globale di
   * `@ilpachi/use-alova` o da `getHttp`): accettata e ignorata, per compatibilità.
   */
  app?: App
}

/** Funzione che annulla l'installazione precedente. */
let uninstallPrevious: (() => void) | null = null

/**
 * Installa l'integrazione del package con l'app. Da chiamare una volta nel boot, dopo `createPachiApp`:
 *
 * ```ts
 * installPachiAdmin({ app: ctx.app })
 * ```
 *
 * - imposta le opzioni (`setPachiAdminOptions`) (il client HTTP è l'istanza globale di `@ilpachi/use-alova`, o `getHttp`);
 * - ascolta `pachi:auth-changed` (emesso dalla shell): a login/ripristino carica i modelli visibili (la voce
 *   «Admin» del menu compare solo se ce n'è almeno uno), a logout svuota la cache.
 *
 * Senza questa chiamata la pagina funziona comunque, ma la voce di menu non compare. Il package non importa la
 * shell. Una seconda chiamata sostituisce la prima.
 *
 * @param options - opzioni del package e `app`
 * @returns funzione che rimuove gli ascoltatori
 */
export function installPachiAdmin(options: IInstallPachiAdminOptions = {}): () => void {
  uninstallPrevious?.()
  const { app: _app, ...rest } = options
  setPachiAdminOptions(rest)
  resetAdminModels()

  let lastUser: string | null | undefined
  const onAuth = (e: Event): void => {
    const detail = (e as CustomEvent<{ authenticated?: boolean, userId?: string | null, username?: string | null }>).detail
    const user = detail?.authenticated ? (detail.userId ?? detail.username ?? '') : null
    // lo stesso utente (es. ripristino sessione dopo il primo caricamento) non invalida l'elenco già richiesto
    if (user !== null && user === lastUser) return
    // primo evento: se il menu o la pagina hanno già richiesto l'elenco con la sessione ripristinata dallo
    // storage (richiesta in volo o riuscita), quell'elenco è dello stesso utente: lo si adotta invece di rifarlo
    if (user !== null && lastUser === undefined && hasRequestedAdminModels()) {
      lastUser = user
      return
    }
    lastUser = user
    resetAdminModels()
    if (user !== null) void loadAdminModels()
  }
  window.addEventListener(AUTH_CHANGED_EVENT, onAuth)
  uninstallPrevious = () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, onAuth)
    uninstallPrevious = null
  }
  return uninstallPrevious
}
