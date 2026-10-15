import type { QTableColumn } from 'quasar'
import type { AlovaExt } from '../helpers/alova-helper'
import type { IOrderState } from './pachitable2'
import type { IPaginatedResponse } from './paginated-response'

/** Per-request options of `createRecord`/`updateRecord`. */
export interface IPachiTable2RequestOptions {
  /** `meta` passed to the alova request (e.g. `{ autoError: false }` to disable the automatic error message). */
  meta?: Record<string, unknown>
}

/** `bulkUpdate` item: the record `id` plus only the fields to change. */
export type PachiTable2BulkItem<T> = Partial<T> & { id: string | number }

/** Alova success event emitted by `pt2:loaded` (the paginated response is in `.data`). */
export interface PachiTable2LoadedEvent<T> {
  /** Paginated server response. */
  data: IPaginatedResponse<T>
  [key: string]: unknown
}

/** Table API methods (`api` of slots and events). */
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

/** Type of the API exposed by the component (the component's `ref`). */
export type PachiTable2Exposed<T> = PachiTable2Api<T> & {
  rows: T[]
  selected: T[]
  filter: string
  loading: boolean
  api: PachiTable2Api<T>
}

/** QTable slot props forwarded by `PachiTable2` (row, column, value...). */
export interface PachiTable2QTableSlotProps<T> {
  row: T
  rowIndex?: number
  key?: string | number
  col: QTableColumn
  value?: unknown
  [key: string]: unknown
}

/** Argument of the slots forwarded by QTable (`body-cell-*`, `header-cell-*`, `body`, ...). */
export interface PachiTable2SlotScope<T, P = PachiTable2QTableSlotProps<T>> {
  slotProps: P
  api: PachiTable2Api<T>
}

/** Argument of the `toolbar-actions` slot. */
export interface PachiTable2ToolbarScope<T> {
  selected: T[]
  filter: string
  pagination: unknown
  paginationHook: unknown
  api: PachiTable2Api<T>
}

/** Argument of the `selection-dialog` slot. */
export interface PachiTable2SelectionScope<T> {
  selected: T[]
  rows: T[]
  api: PachiTable2Api<T>
}

/** Argument of the `error` slot. */
export interface PachiTable2ErrorScope<T> {
  error: unknown
  /** Retries loading the list. */
  retry: () => Promise<void>
  api: PachiTable2Api<T>
}

/** Typed emits of `PachiTable2` (same names as `pachiTable2Emits`). */
export interface PachiTable2Events<T> {
  'pt2:update:multi-sort': [state: IOrderState[]]
  /** Alova success event: the paginated response is in `event.data` (see also `pt2:data`). */
  'pt2:loaded': [event: PachiTable2LoadedEvent<T>]
  /** Clean paginated response `{ items, total, page, pageSize }`. */
  'pt2:data': [response: IPaginatedResponse<T>]
  /** Error loading the list. */
  'pt2:load-error': [error: unknown]
  'pt2:request': [filter: string]
  'pt2:record-created': [records: T[]]
  'pt2:record-updated': [records: T[]]
  'pt2:record-deleted': [records: T[]]
  'pt2:edit-item': [row: T, api: PachiTable2Api<T>]
  'pt2:delete-item': [row: T, api: PachiTable2Api<T>]
}
