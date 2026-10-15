<template>
  <q-th
    :class="classes"
    :style="column.headerStyle"
    :tabindex="column.sortable ? 0 : undefined"
    :aria-sort="ariaSort"
    @click="onSort"
    @keydown.space.prevent
    @keyup.enter="onSort"
    @keyup.space="onSort"
  >
    {{ column.label }}
    <q-badge
      v-if="colInfo.found"
      rounded
      class="transparent pachi-sort-badge"
    >
      <q-icon :name="colInfo.icon" size="1.5em" />
      {{ colInfo.index }}
    </q-badge>
    <q-tooltip v-if="colInfo.found">{{ colInfo.tooltip }}</q-tooltip>
  </q-th>
</template>
<script lang="ts" setup>
import type { QTableColumn } from 'quasar'
import { computed } from 'vue'
import type { IMultipleSortColumnInfo } from '../types/pachitable2'

const { column, getMultiSortColumnInfo, sortByColumn } = defineProps<{
  column: QTableColumn,
  getMultiSortColumnInfo: (colName: string) => IMultipleSortColumnInfo,
  sortByColumn: (col: QTableColumn) => void,
}>()
const colInfo = computed(() => getMultiSortColumnInfo(column.name))

/** Cell classes: alignment, the column's `headerClasses` and `sortable` only if the column is sortable. */
const classes = computed(() => [
  `text-${column.align ?? 'left'}`,
  column.headerClasses,
  { sortable: !!column.sortable },
])

/** ARIA value of the current sort (sortable columns only). */
const ariaSort = computed(() => {
  if (!column.sortable) return undefined
  if (colInfo.value.direction === 'asc') return 'ascending'
  if (colInfo.value.direction === 'desc') return 'descending'
  return 'none'
})

function onSort() {
  if (column.sortable) sortByColumn(column)
}
</script>
<style lang="scss">
  .pachi-sort-badge {
    color: var(--pachi-muted, #64748b);
  }
</style>
