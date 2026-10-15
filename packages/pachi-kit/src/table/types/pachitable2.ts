import type { MaybeRef } from 'vue'
import type { QTableColumn } from 'quasar'

export interface IPachiTable2Props {
  url: string,
  watchingStates?: unknown[],
  extraParams?: MaybeRef<Record<string, unknown>>,
  grid?: boolean,
  rowKey?: string,
  /** Initial sort. */
  initialSort?: IOrderState[],
  /** Historical alias (typo) of `initialSort`. */
  initalSort?: IOrderState[],
  rezDelay?: number,
  rezOffset?: number | undefined,
  /** Actions column (edit/delete). Reactive. With `'emit-delete'` deletion emits `pt2:delete-item`. */
  useColActions?: boolean | 'emit-delete',
  /** Show the edit button: `false` hides it, a function decides per row. Reactive. Default `true`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canEdit?: boolean | ((row: any) => boolean),
  /** Show the delete button: `false` hides it, a function decides per row. Reactive. Default `true`. */
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
 * Pagination configuration for QTable
 *
 * @interface PachiTable2Pagination
 * @property {number} page - Current page number (1-based)
 * @property {number} rowsPerPage - Number of rows per page
 * @property {number} rowsNumber - Total number of available rows
 * @property {number} [pagesNumber] - Total number of pages (computed automatically if not provided)
 * @property {boolean} [sortBy] - Field to sort by
 * @property {boolean} [descending] - If true, descending order
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
  /** Maximum number of visible page buttons */
  maxPages?: number
  /** Show first/last page links */
  boundaryLinks?: boolean
  /** Show previous/next links */
  directionLinks?: boolean
  /** Show numbers at the edges */
  boundaryNumbers?: boolean
  /** Show ellipsis (...) */
  ellipses?: boolean
  /** Show input for direct page jump */
  input?: boolean
  /** Disable pagination */
  disable?: boolean
  /** Options for rows per page */
  rowsPerPageOptions?: number[]
  /** Show rows-per-page selector */
  showRowsPerPage?: boolean
  /** Show pagination info (e.g. "1-10 of 100") */
  showInfo?: boolean
}
