<template>
  <q-page padding class="gallery-table column q-gutter-lg">
    <div class="row items-center q-gutter-md">
      <div class="text-h5">PachiTable2 gallery</div>
      <q-space />
      <span class="text-caption text-grey">
        Fake in-browser API (200 rows, no backend). Edit the package sources: hot reload.
      </span>
      <q-btn outline color="primary" label="Reset data" @click="resetAll" />
    </div>

    <!-- 1. Basic -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-h6">1. Basic table</div>
        <div class="text-caption">Server-side paging, filter box, multi-sort header and pagination.</div>
      </q-card-section>
      <pachi-table2 :key="resetKey" :url="FAKE_URLS.items" :columns="columns" />
    </q-card>

    <!-- 2. Sorting and filtering -->
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-md">
        <div>
          <div class="text-h6">2. Sorting and filtering</div>
          <div class="text-caption">
            Initial sort (price desc, name asc), click headers for multi-sort, exact filters via
            <code>extra-params</code>.
          </div>
        </div>
        <q-space />
        <q-select
          v-model="category"
          :options="CATEGORIES"
          label="Category"
          dense
          outlined
          clearable
          style="min-width: 160px"
        />
        <q-toggle v-model="onlyActive" label="Only active" />
        <div class="text-caption">sort: {{ sortText || 'none' }}</div>
      </q-card-section>
      <pachi-table2
        :key="resetKey"
        :url="FAKE_URLS.items"
        :columns="columns"
        :initial-sort="[
          { column: 'price', direction: 'desc' },
          { column: 'name', direction: 'asc' }
        ]"
        :extra-params="{ category: category ?? undefined, active: onlyActive ? 'true' : undefined }"
        @pt2:update:multi-sort="onSort"
      />
    </q-card>

    <!-- 3. Pagination -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-h6">3. Pagination</div>
        <div class="text-caption">
          Page {{ pageInfo }}. Use the pagination bar; <code>pt2:data</code> reports the response.
        </div>
      </q-card-section>
      <pachi-table2
        :key="resetKey"
        :url="FAKE_URLS.items"
        :columns="columns"
        dense
        @pt2:data="onData"
      />
    </q-card>

    <!-- 3b. List inside a dialog/tab: no pagination bar, no auto height, single-column sort -->
    <q-card flat bordered data-test="gallery-compact">
      <q-card-section>
        <div class="text-h6">3b. Compact list</div>
        <div class="text-caption">
          <code>local-pagination hide-pagination :auto-height="false" single-sort</code>, sorted by name:
          clicking another header replaces the criterion.
        </div>
      </q-card-section>
      <pachi-table2
        :url="FAKE_URLS.items"
        :columns="columns"
        :initial-sort="[{ column: 'name', direction: 'asc' }]"
        local-pagination
        hide-pagination
        :auto-height="false"
        single-sort
        hide-toolbar
        dense
      />
    </q-card>

    <!-- 3c. Rows in memory: no url, no request -->
    <q-card flat bordered data-test="gallery-rows">
      <q-card-section class="row items-center q-gutter-md">
        <div>
          <div class="text-h6">3c. Rows in memory</div>
          <div class="text-caption">
            <code>:rows</code> without <code>url</code>: local filter, sort and selection.
            Selected: <b data-test="rows-selected">{{ memSelected.length }}</b>; rows: {{ memRows.length }}.
          </div>
        </div>
        <q-space />
        <q-toggle v-model="memLoading" label="loading" />
        <q-btn color="primary" label="Drop 10 rows" @click="memRows = memRows.slice(10)" />
      </q-card-section>
      <pachi-table2
        :rows="memRows"
        :columns="columns"
        :loading="memLoading"
        :initial-sort="[{ column: 'name', direction: 'asc' }]"
        single-sort
        hide-pagination
        :auto-height="false"
        selection="multiple"
        dense
        @update:selected="(v: unknown[]) => (memSelected = v)"
      />
    </q-card>

    <!-- 4. Skeleton -->
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-md">
        <div>
          <div class="text-h6">4. Loading skeleton</div>
          <div class="text-caption">
            This resource takes 2.5 s per request; <code>use-skeleton</code> shows the skeleton after
            <code>lazy-loading-timeout</code> (100 ms here).
          </div>
        </div>
        <q-space />
        <q-btn color="primary" label="Reload" @click="skeletonTable?.reload()" />
      </q-card-section>
      <pachi-table2
        ref="skeletonTable"
        :url="FAKE_URLS.slow"
        :columns="columns"
        use-skeleton
        :lazy-loading-timeout="100"
      />
    </q-card>

    <!-- 5. Slots -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-h6">5. Custom cell, header and toolbar slots</div>
        <div class="text-caption">
          <code>body-cell-&lt;name&gt;</code>, <code>header-cell-&lt;name&gt;</code>,
          <code>toolbar-actions</code>, and the <code>error</code> slot (second table, always fails).
        </div>
      </q-card-section>
      <pachi-table2 :key="resetKey" :url="FAKE_URLS.items" :columns="columns">
        <template #toolbar-actions="{ api, filter }">
          <span class="text-caption q-mr-sm">filter: "{{ filter }}"</span>
          <q-btn flat round :icon="mdiRefresh" aria-label="Reload" @click="api.reload()" />
        </template>
        <template #header-cell-price="{ slotProps }">
          <q-th :props="slotProps" class="text-primary">
            <q-icon :name="mdiCurrencyEur" size="xs" /> {{ slotProps.col.label }}
          </q-th>
        </template>
        <template #body-cell-active="{ slotProps }">
          <q-td :props="slotProps">
            <q-icon
              :name="item(slotProps.row).active ? mdiCheckCircle : mdiCloseCircle"
              :color="item(slotProps.row).active ? 'positive' : 'grey'"
            />
          </q-td>
        </template>
        <template #body-cell-stock="{ slotProps }">
          <q-td :props="slotProps">
            <q-badge :color="item(slotProps.row).stock < 10 ? 'negative' : 'primary'" :label="String(slotProps.value)" />
          </q-td>
        </template>
      </pachi-table2>
      <pachi-table2 :url="FAKE_URLS.error" :columns="columns" error-banner>
        <template #error="{ error, retry }">
          <q-banner class="bg-red-1 text-negative" dense>
            Custom error slot: {{ String(error) }}
            <template #action><q-btn flat label="Retry" @click="retry" /></template>
          </q-banner>
        </template>
      </pachi-table2>
    </q-card>

    <!-- 6. Selection and bulk actions -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-h6">6. Selection and bulk actions</div>
        <div class="text-caption">
          <code>selection="multiple"</code> is forwarded to QTable; the floating bar (top right) is the
          <code>selection-dialog</code> slot: bulk delete and bulk deactivate.
        </div>
      </q-card-section>
      <pachi-table2 :key="resetKey" :url="FAKE_URLS.items" :columns="columns" selection="multiple">
        <template #selection-dialog="{ selected, api }">
          <q-btn
            flat
            round
            color="negative"
            :icon="mdiDelete"
            aria-label="Delete selected"
            @click="api.bulkDelete(selected)"
          />
          <q-btn
            flat
            round
            color="primary"
            :icon="mdiCloseCircle"
            aria-label="Deactivate selected"
            @click="api.bulkUpdate(selected.map((r) => ({ id: item(r).id, active: false })))"
          />
        </template>
      </pachi-table2>
    </q-card>

    <!-- 7. Edit/delete events -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-h6">7. Edit and delete events</div>
        <div class="text-caption">
          <code>use-col-actions="emit-delete"</code>: edit and delete emit events, the page handles them
          (own dialogs, then <code>updateRecord</code>/<code>deleteRecord</code>); the log is local state.
          Odd ids cannot be deleted (<code>can-delete</code>).
        </div>
      </q-card-section>
      <pachi-table2
        :key="resetKey"
        :url="FAKE_URLS.items"
        :columns="columns"
        use-col-actions="emit-delete"
        :can-delete="canDelete"
        @pt2:edit-item="onEdit"
        @pt2:delete-item="onDelete"
        @pt2:record-updated="(r: unknown[]) => log(`updated ${ids(r)}`)"
        @pt2:record-deleted="(r: unknown[]) => log(`deleted ${ids(r)}`)"
        @pt2:request="(f: string) => log(`request, filter: ${f}`)"
      />
      <q-card-section>
        <div class="text-subtitle2">Event log</div>
        <div v-for="(line, i) in events" :key="i" class="text-caption">{{ line }}</div>
        <div v-if="!events.length" class="text-caption text-grey">No events yet</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import {
  mdiCheckCircle,
  mdiCloseCircle,
  mdiCurrencyEur,
  mdiDelete,
  mdiRefresh
} from '@quasar/extras/mdi-v7'
import { PachiTable2 } from '@ilpachi/pachi-kit/table'
import type { IOrderState, IPaginatedResponse, PachiTable2Api, PachiTable2Exposed } from '@ilpachi/pachi-kit/table'
import { CATEGORIES, FAKE_URLS, installFakeApi, makeItems, resetFakeStore } from './fake-api'
import type { FakeItem } from './fake-api'

installFakeApi()

const $q = useQuasar()

const columns: QTableColumn<FakeItem>[] = [
  { name: 'id', label: '#', field: 'id', align: 'left', sortable: true },
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'category', label: 'Category', field: 'category', align: 'left', sortable: true },
  {
    name: 'price',
    label: 'Price',
    field: 'price',
    align: 'right',
    sortable: true,
    format: (v: number) => v.toFixed(2)
  },
  { name: 'stock', label: 'Stock', field: 'stock', align: 'right', sortable: true },
  { name: 'active', label: 'Active', field: 'active', align: 'center', sortable: true },
  { name: 'createdAt', label: 'Created', field: 'createdAt', align: 'left', sortable: true }
]

/** Bumped by "Reset data" to remount the tables (they reload from the restored store). */
const resetKey = ref(0)
const memRows = ref<FakeItem[]>(makeItems(60))
const memLoading = ref(false)
const memSelected = ref<unknown[]>([])
const category = ref<string | null>(null)
const onlyActive = ref(false)
const sortState = ref<IOrderState[]>([])
const sortText = computed(() => sortState.value.map((s) => `${s.column} ${s.direction}`).join(', '))
const pageInfo = ref('-')
const events = ref<string[]>([])
const skeletonTable = ref<PachiTable2Exposed<FakeItem> | null>(null)

/**
 * Restores the fake dataset and remounts the tables.
 */
function resetAll(): void {
  resetFakeStore()
  events.value = []
  resetKey.value++
}

/**
 * Keeps the sort state reported by the table.
 *
 * @param state - new multi-sort state
 */
function onSort(state: IOrderState[]): void {
  sortState.value = state
}

/**
 * Appends a line to the local event log (newest first, max 8 lines).
 *
 * @param text - message
 */
function log(text: string): void {
  events.value = [text, ...events.value].slice(0, 8)
}

/** Row typing helper: the table generic cannot be inferred from `url`/`columns`. */
const item = (row: unknown): FakeItem => row as FakeItem

/** Ids of the rows of a `pt2:record-*` event, for the log. */
const ids = (rows: unknown[]): string => rows.map((r) => item(r).id).join(',')

/** Odd ids cannot be deleted. */
const canDelete = (row: unknown): boolean => item(row).id % 2 === 0

/**
 * Shows the page reported by `pt2:data`.
 *
 * @param r - paginated response
 */
function onData(r: IPaginatedResponse<unknown>): void {
  pageInfo.value = `${r.page} (${r.items.length} rows of ${r.total})`
}

/**
 * Opens a prompt dialog and saves the new name with `updateRecord`.
 *
 * @param row - edited row
 * @param api - table API
 */
function onEdit(r: unknown, a: PachiTable2Api<unknown>): void {
  const row = item(r)
  const api = a as PachiTable2Api<FakeItem>
  log(`edit-item ${row.id}`)
  $q.dialog({ title: `Edit #${row.id}`, prompt: { model: row.name, type: 'text' }, cancel: true })
    .onOk((name: string) => api.updateRecord({ ...row, name }))
}

/**
 * Confirms with a custom dialog, then deletes the row with `deleteRecord`.
 *
 * @param row - row to delete
 * @param api - table API
 */
function onDelete(r: unknown, a: PachiTable2Api<unknown>): void {
  const row = item(r)
  const api = a as PachiTable2Api<FakeItem>
  log(`delete-item ${row.id}`)
  $q.dialog({ title: 'Delete', message: `Delete "${row.name}"?`, cancel: true })
    .onOk(() => api.deleteRecord(row))
}
</script>

<style lang="scss">
// the table sizes itself to the viewport: in a gallery every example gets a fixed height
.gallery-table .pachi-table2--container {
  height: 420px !important;
}
</style>
