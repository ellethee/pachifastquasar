import type { MaybeRef } from 'vue'
import type { QTableColumn } from 'quasar'

export interface IPachiTable2Props {
  url: string,
  watchingStates?: unknown[],
  extraParams?: MaybeRef<Record<string, unknown>>,
  grid?: boolean,
  rowKey?: string,
  /** Ordinamento iniziale. */
  initialSort?: IOrderState[],
  /** Alias storico (typo) di `initialSort`. */
  initalSort?: IOrderState[],
  rezDelay?: number,
  rezOffset?: number | undefined,
  /** Colonna azioni (modifica/elimina). Reattiva. Con `'emit-delete'` l'eliminazione emette `pt2:delete-item`. */
  useColActions?: boolean | 'emit-delete',
  /** Mostra il bottone di modifica: `false` lo nasconde, una funzione decide per riga. Reattiva. Default `true`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canEdit?: boolean | ((row: any) => boolean),
  /** Mostra il bottone di eliminazione: `false` lo nasconde, una funzione decide per riga. Reattiva. Default `true`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canDelete?: boolean | ((row: any) => boolean),
  lazyLoadingTimeout?: number,
  columns?: QTableColumn[],
  useSkeleton?: boolean,
  localPagination?: boolean,
  nullsLast?: boolean | string[]
}

export interface IOrderState {
  column: string
  direction: 'asc' | 'desc'
}

export interface IMultipleSortColumnInfo {
  column: string
  direction: 'asc' | 'desc' | undefined
  index: number | string
  icon: string
  tooltip: string
  found: boolean
}

/**
 * Configurazione della paginazione per QTable
 *
 * @interface PachiTable2Pagination
 * @property {number} page - Numero di pagina corrente (1-based)
 * @property {number} rowsPerPage - Numero di righe per pagina
 * @property {number} rowsNumber - Numero totale di righe disponibili
 * @property {number} [pagesNumber] - Numero totale di pagine (calcolato automaticamente se non fornito)
 * @property {boolean} [sortBy] - Campo per l'ordinamento
 * @property {boolean} [descending] - Se true, ordinamento discendente
 */
export interface PachiTable2Pagination {
  page: number
  rowsPerPage: number
  rowsNumber?: number
  pagesNumber?: number
  sortBy?: string | null
  descending?: boolean
}

export interface PachiTable2PaginationProps {
  /** Numero massimo di bottoni pagina visibili */
  maxPages?: number
  /** Mostra link prima/ultima pagina */
  boundaryLinks?: boolean
  /** Mostra link precedente/successivo */
  directionLinks?: boolean
  /** Mostra numeri ai bordi */
  boundaryNumbers?: boolean
  /** Mostra ellipsis (...) */
  ellipses?: boolean
  /** Mostra input per pagina diretta */
  input?: boolean
  /** Disabilita la paginazione */
  disable?: boolean
  /** Opzioni per righe per pagina */
  rowsPerPageOptions?: number[]
  /** Mostra selettore righe per pagina */
  showRowsPerPage?: boolean
  /** Mostra info paginazione (es: "1-10 di 100") */
  showInfo?: boolean
}
