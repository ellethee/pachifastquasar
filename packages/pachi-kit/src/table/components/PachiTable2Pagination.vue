<template>
  <div class="fit row no-wrap justify-around items-center content-center pachi-t2-pagination">
    <div
      v-if="showRowsPerPage"
      class="col-shrink"
      style="overflow: auto; min-width: 220px; max-width: 220px;"
    >
      <q-select
        :model-value="currentRowsPerPage"
        :options="computedRowsPerPageOptions"
        dense
        options-dense
        borderless
        emit-value
        map-options
        class="pachi-t2-pagination__rows-select"
        :display-value="rowsPerPageDisplayValue"
        @update:model-value="onRowsPerPageChange"
      />
    </div>

    <div class="col-grow">
      <q-pagination
        :model-value="currentPage"
        :min="1"
        :max="totalPages"
        :max-pages="maxPages"
        :boundary-links="boundaryLinks"
        :direction-links="directionLinks"
        :boundary-numbers="boundaryNumbers"
        :ellipses="ellipses"
        :input="input"
        :disable="disable"
        dense
        outline
        class="float-right"
        input-class="pachi-t2-pagination__input"
        :icon-first="mdiSkipPrevious"
        :icon-last="mdiSkipNext"
        color="primary"
        active-design="unelevated"
        @update:model-value="onPageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { mdiSkipNext, mdiSkipPrevious } from '@quasar/extras/mdi-v7'
import { computed } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'
import type { PachiTable2Pagination } from '../types/pachitable2'

type QTablePaginationSetter = (
  pagination: Partial<PachiTable2Pagination>,
  forceServerRequest?: boolean,
) => void

interface Props {
  pagination: PachiTable2Pagination
  pagesNumber: number
  isFirstPage: boolean
  isLastPage: boolean
  firstPage: () => void
  prevPage: () => void
  nextPage: () => void
  lastPage: () => void
  setPagination?: QTablePaginationSetter | undefined
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
  /** Mostra selettore righe per pagina. QTable lo renderizza gia' fuori dalla slot pagination. */
  showRowsPerPage?: boolean
  /** Mostra info paginazione (es: "1-10 di 100") */
  showInfo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxPages: 5,
  boundaryLinks: true,
  directionLinks: true,
  boundaryNumbers: true,
  ellipses: true,
  input: true,
  disable: false,
  rowsPerPageOptions: () => [5, 10, 25, 50, 100],
  showRowsPerPage: true,
  showInfo: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: PachiTable2Pagination): void
  (e: 'page-change', page: number): void
  (e: 'rows-per-page-change', rowsPerPage: number): void
}>()

const { t } = usePachiI18n(messages)

const currentPage = computed(() => props.pagination.page)
const currentRowsPerPage = computed(() => props.pagination.rowsPerPage)
const totalRows = computed(() => props.pagination.rowsNumber ?? 0)
const totalPages = computed(() => Math.max(1, props.pagesNumber || 1))

const computedRowsPerPageOptions = computed(() => {
  const baseOptions = props.rowsPerPageOptions.map(value => ({ label: String(value), value }))

  return totalRows.value > 0
    ? [...baseOptions, { label: t('pachiTable2.all'), value: 0 }]
    : baseOptions
})

const rowsPerPageDisplayValue = computed(() => {
  const total = totalRows.value
  const rowsPerPage = currentRowsPerPage.value === 0 ? total : currentRowsPerPage.value

  return t('pachiTable2.rowsPerPage', { rows: rowsPerPage, total })
})


function updatePagination(pagination: Partial<PachiTable2Pagination>) {
  props.setPagination?.(pagination)
  emit('update:modelValue', {
    ...props.pagination,
    ...pagination,
  })
}

function onPageChange(page: number) {
  if (page === currentPage.value) return

  updatePagination({ page })
  emit('page-change', page)
}

function onRowsPerPageChange(value: number | string | null) {
  const rowsPerPage = Number(value)
  if (!Number.isFinite(rowsPerPage) || rowsPerPage === currentRowsPerPage.value) return

  updatePagination({ page: 1, rowsPerPage })
  emit('rows-per-page-change', rowsPerPage)
  emit('page-change', 1)
}
</script>

<style lang="scss">
.pachi-t2-pagination {
  &__rows-select {
    .q-field__control {
      min-height: 32px;
    }
  }
  label.q-field.q-input {
	  width: 6em !important;
}
}
</style>
