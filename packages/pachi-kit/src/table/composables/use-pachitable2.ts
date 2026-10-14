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
 * Logica della tabella (richieste, ordinamento, selezione, CRUD).
 *
 * Reattivita': `options` puo' essere un oggetto, una ref o (consigliato dentro un componente) un getter
 * `() => ({ ...props })`. `url`, `columns`, `rowKey`, `extraParams`, `watchingStates`, `nullsLast`, `initialSort`
 * sono riletti a ogni cambio: un cambio di `url` o di `watchingStates` ricarica i dati dalla prima pagina,
 * un cambio di `columns` ricostruisce le colonne, un cambio di `initialSort` riazzera l'ordinamento.
 * `useColActions`, `canEdit` e `canDelete` sono reattivi (la colonna azioni compare/scompare);
 * `localPagination`, `useSkeleton`, `rezDelay`, `rezOffset`, `lazyLoadingTimeout`
 * sono letti al momento dell'uso e non fanno ricaricare nulla.
 *
 * @param options - opzioni (oggetto, ref o getter)
 * @param emit - funzione emit del componente
 * @returns stato e API della tabella
 */
export function usePachiTable2<T>(options: MaybeRefOrGetter<IPachiTable2Props>, emit?: EmitFn) {
  const { t } = usePachiI18n(messages)
  // $q dell'app risolto in setup (indipendente dalla copia di quasar vista dal package)
  const $q = resolveQuasar()
  const opts = computed(() => toValue(options))
  const _emit: EmitFn = emit ?? (() => { })
  const rowKey = () => opts.value.rowKey ?? 'id'
  const localPagination = opts.value.localPagination ?? false
  const useSkeleton = opts.value.useSkeleton ?? false
  const filter = ref<string>('')

  // L'istanza alova dipende dalla url: viene ricreata solo quando la url cambia.
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

  // Lista stabile degli stati osservati: cambia identita' solo se cambia un elemento (un array letterale
  // ricreato a ogni render del genitore non deve provocare ricariche a vuoto). Include la url.
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

  /** Dopo una cancellazione: se la pagina corrente si svuota torna alla precedente (il cambio pagina ricarica), altrimenti ricarica. */
  async function reloadAfterDelete(removed: number) {
    selected.value = []
    if (!localPagination && page.value > 1 && removed >= rows.value.length) {
      page.value -= 1
      return
    }
    await paginationHook.reload()
  }

  /** Mostra un errore all'utente (Notify) senza far fallire il chiamante. */
  function notifyError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    try {
      showNotify($q, { type: 'negative', message })
    } catch {
      console.error('[pachi-kit/table]', error)
    }
  }

  /** Esegue in parallelo le richieste e restituisce gli elementi riusciti; a fallimento parziale lancia un errore riepilogativo. */
  async function runMultiple(items: T[], doneEvent: string, request: (item: T) => Promise<unknown>): Promise<T[]> {
    const results = await Promise.allSettled(items.map(request))
    const done = items.filter((_, i) => results[i]?.status === 'fulfilled')
    if (done.length < items.length) {
      const reasons = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => r.reason)
      // le righe già eseguite non esistono più (o sono cambiate): restano selezionate solo quelle fallite
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
   * Apre il dialog di conferma e, se confermato, esegue `action` attendendola. Un errore dell'azione viene
   * mostrato con Notify (nessuna unhandled rejection) e la promise risolve comunque `true` (confermato).
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
  // ricalcola anche quando cambia il layout attorno alla tabella (finestra ridimensionata, filtri o barre che crescono)
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
  /** Aggiornamento parziale (`PATCH /<chiave>`): invia solo i campi passati (la chiave resta nell'URL). */
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
    /** Istanza alova corrente (snapshot: se la `url` cambia usa `Get/Post/Put/Delete`, che seguono la url). */
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
