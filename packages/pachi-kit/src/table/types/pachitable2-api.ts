import type { QTableColumn } from 'quasar'
import type { AlovaExt } from '../helpers/alova-helper'
import type { IOrderState } from './pachitable2'
import type { IPaginatedResponse } from './paginated-response'

/** Opzioni per richiesta di `createRecord`/`updateRecord`. */
export interface IPachiTable2RequestOptions {
  /** `meta` passato alla richiesta alova (es. `{ autoError: false }` per disattivare il messaggio di errore automatico). */
  meta?: Record<string, unknown>
}

/** Elemento di `bulkUpdate`: l'`id` del record piu' i soli campi da modificare. */
export type PachiTable2BulkItem<T> = Partial<T> & { id: string | number }

/** Evento di successo di alova emesso da `pt2:loaded` (la risposta paginata e' in `.data`). */
export interface PachiTable2LoadedEvent<T> {
  /** Risposta paginata del server. */
  data: IPaginatedResponse<T>
  [key: string]: unknown
}

/** Metodi dell'API della tabella (`api` degli slot ed eventi). */
export interface PachiTable2Api<T> {
  reload: () => Promise<void>
  onRequest: (props: { pagination: { page: number; rowsPerPage: number; sortBy: string; descending: boolean } }) => void
  createRecord: (item: Partial<T>, options?: IPachiTable2RequestOptions) => Promise<T>
  updateRecord: (item: T, options?: IPachiTable2RequestOptions) => Promise<T>
  patchRecord: (item: T, options?: IPachiTable2RequestOptions) => Promise<T>
  deleteRecord: (item: T) => Promise<void>
  bulkUpdate: (items: Array<PachiTable2BulkItem<T>>) => Promise<void>
  bulkDelete: (items: T[]) => Promise<void>
  multipleUpdate: (items: T[]) => Promise<void>
  multipleDelete: (items: T[]) => Promise<void>
  confirmAction: (message: string, action: (payload?: T) => void | Promise<void>, payload?: T) => Promise<boolean>
  bulkDeleteSelected: () => Promise<void>
  multipleDeleteSelected: () => Promise<void>
  setSelected: (items: T[]) => void
  setFilter: (value: string) => void
  alova: AlovaExt
  Get: AlovaExt['Get']
  Post: AlovaExt['Post']
  Put: AlovaExt['Put']
  Patch: AlovaExt['Patch']
  Delete: AlovaExt['Delete']
}

/** Tipo dell'API esposta dal componente (`ref` del componente). */
export type PachiTable2Exposed<T> = PachiTable2Api<T> & {
  rows: T[]
  selected: T[]
  filter: string
  loading: boolean
  api: PachiTable2Api<T>
}

/** Props degli slot di QTable inoltrati da `PachiTable2` (riga, colonna, valore...). */
export interface PachiTable2QTableSlotProps<T> {
  row: T
  rowIndex?: number
  key?: string | number
  col: QTableColumn
  value?: unknown
  [key: string]: unknown
}

/** Argomento degli slot inoltrati da QTable (`body-cell-*`, `header-cell-*`, `body`, ...). */
export interface PachiTable2SlotScope<T, P = PachiTable2QTableSlotProps<T>> {
  slotProps: P
  api: PachiTable2Api<T>
}

/** Argomento dello slot `toolbar-actions`. */
export interface PachiTable2ToolbarScope<T> {
  selected: T[]
  filter: string
  pagination: unknown
  paginationHook: unknown
  api: PachiTable2Api<T>
}

/** Argomento dello slot `selection-dialog`. */
export interface PachiTable2SelectionScope<T> {
  selected: T[]
  rows: T[]
  api: PachiTable2Api<T>
}

/** Argomento dello slot `error`. */
export interface PachiTable2ErrorScope<T> {
  error: unknown
  /** Ripete il caricamento della lista. */
  retry: () => Promise<void>
  api: PachiTable2Api<T>
}

/** Emits tipizzati di `PachiTable2` (stessi nomi di `pachiTable2Emits`). */
export interface PachiTable2Events<T> {
  'pt2:update:multi-sort': [state: IOrderState[]]
  /** Evento di successo di alova: la risposta paginata e' in `event.data` (vedi anche `pt2:data`). */
  'pt2:loaded': [event: PachiTable2LoadedEvent<T>]
  /** Risposta paginata pulita `{ items, total, page, pageSize }`. */
  'pt2:data': [response: IPaginatedResponse<T>]
  /** Errore nel caricamento della lista. */
  'pt2:load-error': [error: unknown]
  'pt2:request': [filter: string]
  'pt2:record-created': [records: T[]]
  'pt2:record-updated': [records: T[]]
  'pt2:record-deleted': [records: T[]]
  'pt2:edit-item': [row: T, api: PachiTable2Api<T>]
  'pt2:delete-item': [row: T, api: PachiTable2Api<T>]
}
