<template>
  <div ref="container" class="pachi-table2--container q-pt-sm">
    <q-toolbar>
      <q-toolbar-title>
        <q-input
          v-model="filter"
          :placeholder="t('pachiTable2.filter')"
          dense
          clearable
          class="q-ml-md"
          outlined
          debounce="300"
        />
        <q-space />
      </q-toolbar-title>
      <slot name="toolbar-actions" v-bind="{ selected, filter, pagination, paginationHook, api: typedApi }"></slot>
    </q-toolbar>
    <slot
      v-if="loadError && slots.error"
      name="error"
      v-bind="{ error: loadError, retry: retryLoad, api: typedApi }"
    ></slot>
    <q-banner
      v-else-if="loadError && errorBanner"
      class="pachi-table2--error text-negative"
      dense
      inline-actions
    >
      <template #avatar>
        <q-icon :name="mdiAlertCircleOutline" color="negative" />
      </template>
      {{ errorMessage }}
      <template #action>
        <q-btn flat dense color="primary" :label="t('pachiTable2.retry')" @click="retryLoad" />
      </template>
    </q-banner>
    <q-table
      v-if="!shouldIUseSkeleton"
      ref="qtable"
      v-model:pagination="pagination"
      v-model:selected="selected"
      :columns="columns"
      :rows="rows"
      flat
      bordered
      :row-key="rowKey ?? 'id'"
      :filter="filter"
      :loading="loading"
      :grid="grid"
      v-bind="$attrs"
      :rows-per-page-options="[0]"
      :class="tableClasses"
      @request="onRequest"
    >
      <template #header-cell="props">
        <pachi-table2-header-cell
          :column="props.col"
          :get-multi-sort-column-info="getMultiSortColumnInfo"
          :sort-by-column="sortByColumn"
        />
      </template>
      <template #bottom="scope">
        <pachi-table2-pagination
          :pagination="scope.pagination"
          :pages-number="scope.pagesNumber"
          :is-first-page="scope.isFirstPage"
          :is-last-page="scope.isLastPage"
          :first-page="scope.firstPage"
          :prev-page="scope.prevPage"
          :next-page="scope.nextPage"
          :last-page="scope.lastPage"
          :set-pagination="qtable?.setPagination"
        />
      </template>
      <template v-for="name in forwardedSlotNames" :key="name" #[name]="slotProps">
        <slot :name="name" v-bind="{ slotProps, api: typedApi }" ></slot>
      </template>

      <template v-if="actionsVisible" #body-cell-pachitable2_actions="slotProps">
        <q-td key="pachitable2_actions" class="text-center">
          <q-btn
            v-if="hasEditHandler && resolveRowFlag(canEdit, slotProps.row)"
            class="pachi-t2-edit-item"
            :aria-label="t('pachiTable2.editRow')"
            size="12px"
            color="positive"
            flat
            dense
            round
            :icon="mdiPencil"
            @click="emit('pt2:edit-item', slotProps.row, typedApi)"
          />
          <q-btn
            v-if="resolveRowFlag(canDelete, slotProps.row)"
            :aria-label="t('pachiTable2.deleteRow')"
            size="12px"
            color="negative"
            flat
            dense
            round
            :icon="mdiDelete"
            @click="onDeleteRecordClick(slotProps.row)"
          />
        </q-td>
      </template>
    </q-table>
    <pachi-table2-skeleton
      v-if="shouldIUseSkeleton"
      :columns="columns"
      :table-classes="tableClasses"
      v-bind="$attrs"
    />
  </div>
  <transition name="pachi-slide-card-slow" >
    <q-btn-group
      v-if="showSelectedDialog"
      class="pachi-selection-dialog pachi-blueprint-card"
      rounded
    >
      <slot name="selection-dialog" v-bind="{ selected, rows, api: typedApi }"></slot>
      <q-btn
        flat
        round
        :icon="mdiPlaylistRemove"
        color="secondary"
        :aria-label="t('pachiTable2.clearSelection')"
        @click="selected = []"
      >
        <q-tooltip>{{ t('pachiTable2.clearSelection') }}</q-tooltip>
      </q-btn>
    </q-btn-group>
  </transition>
  <q-dialog
    :model-value="shouldIUseLazyLoading"
    persistent
    transition-show="scale"
    transition-hide="scale"
    class="pachi-loading-dialog"
  >
    <q-spinner size="50px" color="primary" />
  </q-dialog>
</template>
<script setup lang="ts" generic="T">
import { computed, getCurrentInstance, ref, useSlots } from 'vue'
import type { Slots } from 'vue'
import PachiTable2Skeleton from './PachiTable2Skeleton.vue'
import PachiTable2HeaderCell from './PachiTable2HeaderCell.vue'
import PachiTable2Pagination from './PachiTable2Pagination.vue'
import { mdiAlertCircleOutline, mdiDelete, mdiPencil, mdiPlaylistRemove } from '@quasar/extras/mdi-v7'
import type { QTableColumn } from 'quasar'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { usePachiTable2 } from '../composables/use-pachitable2'
import { messages } from '../locales'
import type { IOrderState, PachiTable2Pagination as PachiTable2PaginationState } from '../types/pachitable2'
import type { IPaginatedResponse } from '../types/paginated-response'
import type {
  PachiTable2Api,
  PachiTable2ErrorScope,
  PachiTable2LoadedEvent,
  PachiTable2SelectionScope,
  PachiTable2SlotScope,
  PachiTable2ToolbarScope,
} from '../types/pachitable2-api'
import { hasEventListener, resolveRowFlag, shouldShowActionsColumn } from '../helpers/props-helper'

type QTablePaginationSetter = (
  pagination: Partial<PachiTable2PaginationState>,
  forceServerRequest?: boolean,
) => void

defineSlots<{
  'toolbar-actions'?(scope: PachiTable2ToolbarScope<T>): unknown
  'selection-dialog'?(scope: PachiTable2SelectionScope<T>): unknown
  /** Stato di errore del caricamento lista (sostituisce il banner di `error-banner`). */
  error?(scope: PachiTable2ErrorScope<T>): unknown
  /** Celle del corpo, per colonna: `#body-cell-<nome>="{ slotProps, api }"`. */
  [key: `body-cell-${string}`]: ((scope: PachiTable2SlotScope<T>) => unknown) | undefined
  /** Celle di intestazione, per colonna: `#header-cell-<nome>`. */
  [key: `header-cell-${string}`]: ((scope: PachiTable2SlotScope<T>) => unknown) | undefined
  /** Altri slot di QTable (`body`, `top`, `no-data`, `loading`, ...). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: ((scope: any) => unknown) | undefined
}>()
const props = defineProps<{
  url: string,
  watchingStates?: unknown[],
  extraParams?: Record<string, unknown>,
  grid?: boolean,
  rowKey?: string,
  rezDelay?: number,
  rezOffset?: number | undefined,
  useColActions?: boolean | 'emit-delete',
  /** Mostra il bottone di modifica (`false` lo nasconde; funzione = per riga). Reattiva. Default `true`. */
  canEdit?: boolean | ((row: T) => boolean),
  /** Mostra il bottone di eliminazione (`false` lo nasconde; funzione = per riga). Reattiva. Default `true`. */
  canDelete?: boolean | ((row: T) => boolean),
  /** Mostra un banner con messaggio e "Riprova" quando il caricamento della lista fallisce (alternativa: slot `error`). */
  errorBanner?: boolean,
  lazyLoadingTimeout?: number,
  columns: QTableColumn[],
  useSkeleton?: boolean,
  /** Ordinamento iniziale (colonne e direzioni). */
  initialSort?: IOrderState[],
  /** Alias storico (typo) di `initialSort`, mantenuto per retrocompatibilita'. */
  initalSort?: IOrderState[],
  localPagination?: boolean,
  nullsLast?: boolean | string[],
}>()
const { t } = usePachiI18n(messages)
const emit = defineEmits<{
  /** Stato di ordinamento multiplo aggiornato. */
  'pt2:update:multi-sort': [state: IOrderState[]]
  /** Evento di successo di alova (la risposta paginata è in `.data`); vedi anche `pt2:data`. */
  'pt2:loaded': [event: PachiTable2LoadedEvent<T>]
  /** Risposta paginata `{ items, total, page, pageSize }`. */
  'pt2:data': [response: IPaginatedResponse<T>]
  'pt2:load-error': [error: unknown]
  'pt2:request': [filter: string]
  'pt2:record-created': [records: T[]]
  'pt2:record-updated': [records: T[]]
  'pt2:record-deleted': [records: T[]]
  'pt2:edit-item': [row: T, api: PachiTable2Api<T>]
  'pt2:delete-item': [row: T, api: PachiTable2Api<T>]
}>()
const slots = useSlots() as unknown as Slots
const instance = getCurrentInstance()
// `@pt2:edit-item` e `@pt2:editItem` (SFC) producono `onPt2:editItem`; da JSX/render `onPt2:edit-item`: li gestiamo tutti
const hasEditHandler = computed(() => hasEventListener(instance?.vnode.props, 'pt2:edit-item'))
const actionsVisible = computed(() => shouldShowActionsColumn(props.useColActions, props.canEdit, props.canDelete))
/** Slot propri del componente, non inoltrati a QTable. */
const ownSlots = ['toolbar-actions', 'selection-dialog', 'error']
const forwardedSlotNames = computed(() => Object.keys(slots).filter(n => !ownSlots.includes(n)))
const qtable = ref<{ setPagination: QTablePaginationSetter } | null>(null)


const {
  filter,
  pagination,
  rows,
  loading,
  selected,
  showSelectedDialog,
  shouldIUseSkeleton,
  shouldIUseLazyLoading,
  tableClasses,
  getMultiSortColumnInfo,
  onDeleteRecordClick,
  paginationHook,
  onRequest,
  columns,
  sortByColumn,
  loadError,
  retryLoad,
  api,
} = usePachiTable2<T>(
  // getter: url, columns, rowKey, extraParams, watchingStates, nullsLast e initialSort restano reattivi alle props
  () => ({
    url: props.url,
    watchingStates: props.watchingStates ?? [],
    extraParams: props.extraParams ?? {},
    grid: props.grid ?? false,
    rowKey: props.rowKey ?? 'id',
    rezDelay: props.rezDelay ?? 100,
    rezOffset: props.rezOffset,
    useColActions: props.useColActions ?? false,
    canEdit: props.canEdit ?? true,
    canDelete: props.canDelete ?? true,
    lazyLoadingTimeout: props.lazyLoadingTimeout ?? 300,
    columns: props.columns ?? [],
    useSkeleton: props.useSkeleton ?? false,
    initialSort: props.initialSort ?? props.initalSort ?? [],
    localPagination: props.localPagination ?? false,
    nullsLast: props.nullsLast ?? false,
  }),
  emit as (event: string, ...args: unknown[]) => void,
)
const typedApi = api as unknown as PachiTable2Api<T>
const errorMessage = computed(() => {
  const e = loadError.value
  const msg = e instanceof Error ? e.message : String(e ?? '')
  return msg || t('pachiTable2.loadError')
})


defineExpose({ ...api, api, rows, selected, filter, loading, error: loadError })
</script>
<style lang="scss">
.pachi-table-2 {
  border-radius: var(--pachi-card-r);

  &.pachi-items-container {
    overflow-y: auto !important;
  }

  &.pachi-table-container {
    overflow-y: auto !important;

    thead tr th {
      position: sticky;
      z-index: 3;
    }

    thead tr:first-child th {
      top: 0;
    }

    .q-table__top,
    .q-table__bottom,
    thead tr:first-child th {
      background-color: var(--pachi-surface-2) !important;
    }

    &.q-table--loading thead tr:last-child th {
      top: 48px;
    }

    tbody {
      scroll-margin-top: 48px;
    }
  }

  .q-table__grid-content.row {
    margin-top: 0 !important;
  }

  .grid-style-transition {
    transition: transform .28s, background-color .28s;
  }

  .q-table__grid-content.row {
    max-height: calc(100vh - 200px) !important;
    overflow-y: auto !important;
  }
}

// ── Altezza ───────────────────────────────────────────────────────────────────
// il contenitore ha l'altezza calcolata (resto del viewport): toolbar a parte, la tabella prende lo spazio rimasto
// (senza, toolbar + tabella al 100% superano il contenitore e la paginazione esce dal viewport)
.pachi-table2--container {
  display: flex;
  flex-direction: column;

  > .q-table__container {
    flex: 1 1 auto;
    min-height: 0;
  }
}

// ── Toolbar del filtro ────────────────────────────────────────────────────────
.pachi-table2--container>.q-toolbar {
  padding: 0 8px;
  min-height: 48px;
  border-bottom: 1px solid var(--pachi-border);
  background: var(--pachi-surface);
}

.pachi-table2--error {
  border-bottom: 1px solid var(--pachi-border);
}

.pachi-loading-dialog {
  .q-dialog__inner {
    backdrop-filter: blur(5px) saturate(180%) contrast(90%) invert(50%);
  }
}

.pachi-loading-dialog .q-dialog__inner--minimized>div {
  max-width: unset !important;
}

// ── Barra selezione multipla ──────────────────────────────────────────────────
.pachi-selection-dialog {
  position: fixed !important;
  top: 118px !important;
  right: 18px !important;
  z-index: 9999 !important;
  background-color: var(--pachi-accent-soft) !important;
  border: 1px solid var(--pachi-accent-mid) !important;
  border-radius: var(--pachi-card-r) !important;
  min-height: 42px !important;
  justify-content: right !important;
}

// ── Transizioni slide ────────────────────────────────────────────────────────
.pachi-slide-card-slow-enter-active,
.pachi-slide-card-slow-leave-active {
  transition: transform 0.95s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease;
  will-change: transform, opacity;
}

.pachi-slide-card-slow-enter-from {
  transform: translateX(110%);
  opacity: 0;
}

.pachi-slide-card-slow-enter-to {
  transform: translateX(0);
  opacity: 1;
}

.pachi-slide-card-slow-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.pachi-slide-card-slow-leave-to {
  transform: translateX(110%);
  opacity: 0;
}

// ── Modern table variant ──────────────────────────────────────────────────────
.pachi-modern-table {
  font-family: var(--pachi-font);
  letter-spacing: -0.011em;
  overflow: hidden;
  border: 1px solid var(--pachi-border);

  thead tr th {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    color: var(--pachi-muted);
    letter-spacing: 0.06em;
  }

  tbody tr {
    transition: background-color 0.15s ease;

    td {
      font-size: 12px;
      padding: 0 12px;
      // border-bottom: none;
    }

    &:hover {
      background-color: var(--pachi-surface-3) !important;
      cursor: pointer;
    }
  }
}
</style>
