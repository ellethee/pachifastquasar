import { mdiArrowDown, mdiArrowUp, mdiCheck, mdiClose } from '@quasar/extras/mdi-v7'
import type { MaybeRefOrGetter, Ref, WatchSource } from 'vue'
import type { RequestBody } from 'alova'
import { computed, onBeforeUnmount, onMounted, onUpdated, ref, shallowRef, toValue, useTemplateRef, watch } from 'vue'
import type { IPachiTable2Props, IMultipleSortColumnInfo, IOrderState } from '../types/pachitable2'
import { createPachiAlova, usePagination } from '../helpers/alova-helper'
import type { AlovaExt } from '../helpers/alova-helper'
import type { IPaginatedResponse } from '../types/paginated-response'
import type { QTableColumn } from 'quasar'
import { openDialog, resolveQuasar, showNotify } from '../helpers/quasar-instance'
import { multiSort } from '../helpers/sort-helper'
import { buildOrderBy, buildRequestParams, encodeKey, encodeQueryParams, shallowEqualArrays } from '../helpers/request-helper'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'
import { resolveRowFlag, shouldShowActionsColumn } from '../helpers/props-helper'
import type { IPachiTable2RequestOptions, PachiTable2BulkItem } from '../types/pachitable2-api'

export const pachiTable2Emits = [
  'pt2:update:multi-sort',
  'pt2:loaded',
  'pt2:data',
  'pt2:load-error',
  'pt2:request',
  'pt2:record-created',
  'pt2:record-updated',
  'pt2:record-deleted',
  'pt2:edit-item',
  'pt2:delete-item',
] as const

type EmitFn = (event: string, ...args: unknown[]) => void

/**
 * Table logic (requests, sorting, selection, CRUD).
 *
 * Reactivity: `options` can be an object, a ref or (recommended inside a component) a getter
 * `() => ({ ...props })`. `url`, `columns`, `rowKey`, `extraParams`, `watchingStates`, `nullsLast`, `initialSort`
 * are re-read on every change: a change of `url` or `watchingStates` reloads the data from the first page,
 * a change of `columns` rebuilds the columns, a change of `initialSort` resets the sorting.
 * `useColActions`, `canEdit` and `canDelete` are reactive (the actions column appears/disappears);
 * `localPagination`, `useSkeleton`, `rezDelay`, `rezOffset`, `lazyLoadingTimeout`
 * are read at the time of use and do not trigger any reload.
 *
 * @param options - options (object, ref or getter)
 * @param emit - component's emit function
 * @returns table state and API
 */
export function usePachiTable2<T>(options: MaybeRefOrGetter<IPachiTable2Props>, emit?: EmitFn) {
  const { t } = usePachiI18n(messages)
  // the app's $q resolved in setup (independent of the copy of quasar seen by the package)
  const $q = resolveQuasar()
  const opts = computed(() => toValue(options))
  const _emit: EmitFn = emit ?? (() => { })
  const rowKey = () => opts.value.rowKey ?? 'id'
  const localPagination = opts.value.localPagination ?? false
  const useSkeleton = opts.value.useSkeleton ?? false
  const filter = ref<string>('')

  // The alova instance depends on the url: it is recreated only when the url changes.
  let alovaUrl = opts.value.url
  let alovaInstance = createPachiAlova({ url: alovaUrl })
  function currentAlova(): AlovaExt {
    if (opts.value.url !== alovaUrl) {
      alovaUrl = opts.value.url
      alovaInstance = createPachiAlova({ url: alovaUrl })
    }
    return alovaInstance
  }

  const initialSortOf = () => opts.value.initialSort ?? opts.value.initalSort ?? []
  const sortState = ref<IOrderState[]>([...initialSortOf()])
  watch(() => JSON.stringify(initialSortOf()), () => { sortState.value = [...initialSortOf()] })

  function buildColumns(): QTableColumn[] {
    const cols = [...(opts.value.columns ?? [])]
    if (shouldShowActionsColumn(opts.value.useColActions, opts.value.canEdit, opts.value.canDelete)) {
      cols.push({
        name: 'pachitable2_actions',
        label: t('pachiTable2.actions'),
        field: 'pachitable2_actions',
        align: 'center',
        sortable: false,
      })
    }
    return cols
  }
  const localCols = ref<QTableColumn[]>(buildColumns())
  watch(
    () => [opts.value.columns, !!opts.value.useColActions, shouldShowActionsColumn(opts.value.useColActions, opts.value.canEdit, opts.value.canDelete)],
    () => { localCols.value = buildColumns() },
  )


  function getMultiSortColumnInfo(colName: string): IMultipleSortColumnInfo {
    const state = sortState.value.find(s => s.column === colName)
    if (!state) return { direction: undefined, index: '', icon: '', tooltip: '', found: false, column: colName }
    const index = sortState.value.findIndex(s => s.column === colName) +1
    return {
      direction: state.direction,
      index: index ,
      icon: state.direction === 'asc' ? mdiArrowUp : mdiArrowDown,
      tooltip: t(state.direction === 'asc' ? 'pachiTable2.sortAsc' : 'pachiTable2.sortDesc', { position: index }),
      found: true,
      column: colName
    }
  }

  function sortByColumn(col: QTableColumn) {
    const currentState = sortState.value.find(s => s.column === col.name)
    if (!currentState) {
      sortState.value.push({ column: col.name, direction: 'asc' })
    } else if (currentState.direction === 'asc') {
      currentState.direction = 'desc'
    } else {
      sortState.value = sortState.value.filter(s => s.column !== col.name)
    }
    // Emit an event with the new multi-sort state
    _emit('pt2:update:multi-sort', [...sortState.value])
  }
  const orderBy = computed(() => buildOrderBy(sortState.value))

  function sortItems(items: T[]): T[] {
    if (sortState.value.length === 0) return items
    return multiSort(items, sortState.value, opts.value.nullsLast ?? false)
  }


  const shouldIUseSkeleton = computed(() => useSkeleton && lazyLoading.value)
  const shouldIUseLazyLoading = computed(() => lazyLoading.value && !shouldIUseSkeleton.value)
  const selected: Ref<T[]> = ref([])
  const showSelectedDialog = computed(() => selected.value.length > 0)
  const container = useTemplateRef<HTMLElement>('container')

  const tableClasses = computed(() => {
    const grid = opts.value.grid ?? false
    return {
      'pachi-table-2': true,
      'pachi-modern-table': true,
      'fit': true,
      'row': true,
      'wrap': true,
      'justify-between': true,
      'pachi-table-container': !grid,
      'pachi-items-container': grid,
      'q-px-none': true,
      'q-mx-none': true,
      'pachi-blueprint-card': !grid,
    }
  })

  const extraParamsComputed = computed(() => toValue(opts.value.extraParams) ?? {})

  // Stable list of the watched states: it changes identity only if an element changes (a literal array
  // recreated on every parent render must not cause idle reloads). Includes the url.
  const watchedList = computed<unknown[]>(() => [opts.value.url, ...(opts.value.watchingStates ?? []).map(s => toValue(s))])
  const stableWatched = shallowRef<unknown[]>(watchedList.value)
  watch(watchedList, (next) => {
    if (!shallowEqualArrays(next, stableWatched.value)) stableWatched.value = next
  })

  const paginationHook = usePagination(
    (page, pageSize) => currentAlova().Get<IPaginatedResponse<T>>('', {
      params: encodeQueryParams(buildRequestParams({
        page,
        pageSize,
        localPagination,
        orderBy: orderBy.value,
        search: filter.value,
        extraParams: extraParamsComputed.value,
      })),
      cacheFor: null,
    }),
    {
      initialData: { items: [], total: 0 },
      total: (res: IPaginatedResponse<T>) => res.total,
      data: (res: IPaginatedResponse<T>) => res.items,
      initialPage: 1,
      initialPageSize: localPagination ? 0 : 50,
      preloadNextPage: false,
      preloadPreviousPage: false,
      watchingStates: [
        ...(localPagination ? [] : [orderBy, filter]),
        extraParamsComputed,
        stableWatched,
      ] as WatchSource[],
      debounce: 300,
    },
  )
  const { page, pageSize, data: rawRows, total, loading } = paginationHook

  // In local mode rows are sorted client-side; in remote mode the server sorts them.
  const rows = computed<T[]>(() =>
    localPagination ? sortItems(rawRows.value as T[]) : (rawRows.value as T[])
  )

  const pagination = ref<{ page: number; rowsPerPage: number; rowsNumber?: number }>(
    localPagination
      ? { page: 1, rowsPerPage: 50 }
      : { page: page.value, rowsPerPage: pageSize.value, rowsNumber: total.value ?? 0 }
  )
  const lazyLoading = ref(false)
  let lazyTimer: ReturnType<typeof setTimeout> | undefined
  let resizeTimer: ReturnType<typeof setTimeout> | undefined
  watch(loading, (val) => {
    clearTimeout(lazyTimer)
    if (val) {
      lazyTimer = setTimeout(() => {
        if (loading.value) lazyLoading.value = true
      }, opts.value.lazyLoadingTimeout ?? 300)
    } else {
      lazyLoading.value = false
    }
  })
  onBeforeUnmount(() => {
    clearTimeout(lazyTimer)
    clearTimeout(resizeTimer)
  })
  if (!localPagination) {
    watch(total, (val) => { if (val !== undefined) pagination.value.rowsNumber = val })
    watch(page, (val) => { pagination.value.page = val })
    watch(pageSize, (val) => { pagination.value.rowsPerPage = val })
  }

  const loadError = shallowRef<unknown>(null)
  paginationHook.onSuccess((r) => {
    loadError.value = null
    _emit('pt2:loaded', r)
    _emit('pt2:data', (r as unknown as { data: IPaginatedResponse<T> }).data)
  })
  paginationHook.onError((e) => {
    loadError.value = e.error
    _emit('pt2:load-error', e.error)
  })
  watch(loading, (val) => { if (val) loadError.value = null })

  function onRequest(props: { pagination: { page: number; rowsPerPage: number; sortBy: string; descending: boolean } }) {
    if (localPagination) return
    page.value = props.pagination.page
    pageSize.value = props.pagination.rowsPerPage
    _emit('pt2:request', filter.value)
  }
  const keyOf = (item: T) => String(item[rowKey() as keyof T])

  /** After a deletion: if the current page becomes empty go back to the previous one (the page change reloads), otherwise reload. */
  async function reloadAfterDelete(removed: number) {
    selected.value = []
    if (!localPagination && page.value > 1 && removed >= rows.value.length) {
      page.value -= 1
      return
    }
    await paginationHook.reload()
  }

  /** Shows an error to the user (Notify) without making the caller fail. */
  function notifyError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    try {
      showNotify($q, { type: 'negative', message })
    } catch {
      console.error('[pachi-kit/table]', error)
    }
  }

  /** Runs the requests in parallel and returns the successful items; on partial failure it throws a summary error. */
  async function runMultiple(items: T[], doneEvent: string, request: (item: T) => Promise<unknown>): Promise<T[]> {
    const results = await Promise.allSettled(items.map(request))
    const done = items.filter((_, i) => results[i]?.status === 'fulfilled')
    if (done.length < items.length) {
      const reasons = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => r.reason)
      // the rows already processed no longer exist (or have changed): only the failed ones stay selected
      selected.value = items.filter((_, i) => results[i]?.status === 'rejected')
      await paginationHook.reload()
      if (done.length > 0) _emit(doneEvent, done)
      throw new Error(t('pachiTable2.multipleFailed', { ok: done.length, total: items.length }), { cause: reasons })
    }
    return done
  }

  async function createRecord(item: Partial<T>, options?: IPachiTable2RequestOptions): Promise<T> {
    const result = await currentAlova().Post<T>('/', item as RequestBody, { cacheFor: null, ...(options?.meta ? { meta: options.meta } : {}) })
    await paginationHook.reload()
    _emit('pt2:record-created', [result])
    return result
  }
  async function updateRecord(item: T, options?: IPachiTable2RequestOptions): Promise<T> {
    const result = await currentAlova().Put<T>(`/${encodeKey(keyOf(item))}`, item as RequestBody, { cacheFor: null, ...(options?.meta ? { meta: options.meta } : {}) })
    await paginationHook.reload()
    _emit('pt2:record-updated', [result])
    return result
  }
  async function onDeleteRecordClick(item: T) {
    if (!resolveRowFlag(opts.value.canDelete, item)) return
    if (opts.value.useColActions === 'emit-delete') {
      _emit('pt2:delete-item', item, api)
      return
    }
    await confirmAction(t('pachiTable2.confirmDelete'), (payload?: T) => payload ? deleteRecord(payload) : undefined, item)
  }
  async function deleteRecord(item: T) {
    await currentAlova().Delete(`/${encodeKey(keyOf(item))}`, { cacheFor: null })
    await reloadAfterDelete(1)
    _emit('pt2:record-deleted', [item])
  }
  async function multipleUpdate(items: T[]) {
    const done = await runMultiple(items, 'pt2:record-updated', item => currentAlova().Put(`/${encodeKey(keyOf(item))}`, item as RequestBody, { cacheFor: null }))
    await paginationHook.reload()
    _emit('pt2:record-updated', done)
  }
  async function multipleDelete(items: T[]) {
    const done = await runMultiple(items, 'pt2:record-deleted', item => currentAlova().Delete(`/${encodeKey(keyOf(item))}`, { cacheFor: null }))
    await reloadAfterDelete(done.length)
    _emit('pt2:record-deleted', done)
  }
  async function bulkUpdate(items: Array<PachiTable2BulkItem<T>>) {
    await currentAlova().Post('/bulk-update', { items }, { cacheFor: null })
    await paginationHook.reload()
    _emit('pt2:record-updated', items as unknown as T[])
  }
  async function bulkDelete(items: T[]) {
    const ids = items.map(item => (item[rowKey() as keyof T]))
    await currentAlova().Post('/bulk-delete', ids, { cacheFor: null })
    await reloadAfterDelete(items.length)
    _emit('pt2:record-deleted', items)
  }
  async function bulkDeleteSelected() {
    if (selected.value.length === 0) return
    await bulkDelete(selected.value)
  }
  async function multipleDeleteSelected() {
    if (selected.value.length === 0) return
    await multipleDelete(selected.value)
  }
  /**
   * Opens the confirmation dialog and, if confirmed, runs `action` and awaits it. An action error is
   * shown with Notify (no unhandled rejection) and the promise still resolves `true` (confirmed).
   */
  function confirmAction(message: string, action: (payload?: T) => void | Promise<void>, payload?: T): Promise<boolean> {
    return new Promise((resolve) => {
      openDialog($q, {
        title: t('pachiTable2.confirmTitle'),
        message,
        focus: 'cancel',
        persistent: true,
        ok: { icon: mdiCheck, round: true, flat: true, label: null, color: 'positive' },
        cancel: { icon: mdiClose, round: true, flat: true, label: null, color: 'negative' },
      }).onOk(() => {
        Promise.resolve()
          .then(() => action(payload))
          .catch(notifyError)
          .finally(() => resolve(true))
      }).onCancel(() => { resolve(false) })
    })
  }

  function doResize() {
    const el = container.value
    if (!el) return
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const top = el.getBoundingClientRect().top
      let bottomSpace: number
      const rezOffset = opts.value.rezOffset
      if (rezOffset !== undefined) {
        bottomSpace = rezOffset
      } else {
        bottomSpace = 8
        let sib = el.nextElementSibling as HTMLElement | null
        while (sib) {
          bottomSpace += sib.getBoundingClientRect().height
          sib = sib.nextElementSibling as HTMLElement | null
        }
      }
      const height = `calc(100vh - ${top + bottomSpace}px)`
      if (el.style.height !== height) el.style.height = height
    }, opts.value.rezDelay ?? 100)
  }
  // also recompute when the layout around the table changes (resized window, growing filters or bars)
  let resizeObserver: ResizeObserver | undefined
  onMounted(() => {
    doResize()
    window.addEventListener('resize', doResize)
    const parent = container.value?.parentElement
    if (parent && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => doResize())
      resizeObserver.observe(parent)
    }
  })
  onBeforeUnmount(() => {
    window.removeEventListener('resize', doResize)
    resizeObserver?.disconnect()
  })
  onUpdated(() => doResize())
  async function retryLoad() { await paginationHook.reload() }
  async function reload() {
    await paginationHook.reload()
  }
  /** Partial update (`PATCH /<key>`): sends only the passed fields (the key stays in the URL). */
  async function patchRecord(item: T, options?: IPachiTable2RequestOptions): Promise<T> {
    const result = await currentAlova().Patch<T>(`/${encodeKey(keyOf(item))}`, item as RequestBody, { cacheFor: null, ...(options?.meta ? { meta: options.meta } : {}) })
    await paginationHook.reload()
    _emit('pt2:record-updated', [result])
    return result
  }
  function setSelected(items: T[]) { selected.value = items }
  function setFilter(value: string) { filter.value = value }
  const api = {
    reload,
    onRequest,
    createRecord,
    updateRecord,
    patchRecord,
    deleteRecord,
    bulkUpdate,
    bulkDelete,
    multipleDelete,
    multipleUpdate,
    confirmAction,
    bulkDeleteSelected,
    multipleDeleteSelected,
    setSelected,
    setFilter,
    /** Current alova instance (snapshot: if the `url` changes use `Get/Post/Put/Delete`, which follow the url). */
    get alova() { return currentAlova() },
    Get: ((...args: Parameters<AlovaExt['Get']>) => currentAlova().Get(...args)) as AlovaExt['Get'],
    Post: ((...args: Parameters<AlovaExt['Post']>) => currentAlova().Post(...args)) as AlovaExt['Post'],
    Put: ((...args: Parameters<AlovaExt['Put']>) => currentAlova().Put(...args)) as AlovaExt['Put'],
    Patch: ((...args: Parameters<AlovaExt['Patch']>) => currentAlova().Patch(...args)) as AlovaExt['Patch'],
    Delete: ((...args: Parameters<AlovaExt['Delete']>) => currentAlova().Delete(...args)) as AlovaExt['Delete'],
  }

  return {
    rows,
    columns: localCols,
    getMultiSortColumnInfo,
    sortByColumn,
    filter,
    pagination,
    loading,
    shouldIUseSkeleton,
    shouldIUseLazyLoading,
    selected,
    showSelectedDialog,
    sortItems,
    container,
    onDeleteRecordClick,
    tableClasses,
    paginationHook,
    loadError,
    retryLoad,
    api,
    ...api,
  }
}
