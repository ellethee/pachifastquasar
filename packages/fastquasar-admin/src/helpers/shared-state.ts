import { ref } from 'vue'
import type { Ref } from 'vue'
import type { IAdminModelInfo } from '../types/admin'
import type { IResolvedAdminOptions } from './options'

/** Stato condiviso del package. */
export interface IAdminSharedState {
  /** Opzioni correnti (`undefined` = default). */
  options: IResolvedAdminOptions | undefined
  /** Modelli visibili dell'utente; `null` = non ancora noto. */
  models: Ref<IAdminModelInfo[] | null>
  /** Caricamento dei modelli in corso. */
  inflight: Promise<void> | null
  /** Ultima richiesta dell'elenco modelli (condivisa tra menu e pagina). */
  list: { at: number, promise: Promise<IAdminModelInfo[]> } | null
  /** Incrementato a ogni reset (cambio utente/logout): una risposta di un'epoca precedente va scartata. */
  epoch: number
  /** Istante (ms) dell'ultimo caricamento fallito per un errore transitorio (rete, 5xx), per limitare i tentativi. */
  failedAt: number
}

const KEY = Symbol.for('@ilpachi/fastquasar-admin/state')

/**
 * Stato condiviso, ancorato a `globalThis`: la shell carica `menu`/`routes` con `import.meta.glob` (spesso da
 * `dist/`) mentre l'app importa il package dal punto d'ingresso; in sviluppo possono essere due copie del modulo
 * e devono comunque vedere le stesse opzioni, lo stesso client HTTP e lo stesso elenco di modelli.
 *
 * @returns lo stato unico del processo/finestra
 */
export function sharedState(): IAdminSharedState {
  const g = globalThis as unknown as Record<symbol, IAdminSharedState | undefined>
  g[KEY] ??= { options: undefined, models: ref<IAdminModelInfo[] | null>(null), inflight: null, list: null, epoch: 0, failedAt: 0 }
  return g[KEY]
}
