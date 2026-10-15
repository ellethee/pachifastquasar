<template>
  <div class="pachi-admin-model">
    <div v-if="schemaLoading" class="pachi-admin-state">
      <q-spinner size="28px" color="primary" />
      <div>{{ t('pachiAdmin.common.loading') }}</div>
    </div>
    <div v-else-if="schemaError || !schema" class="pachi-admin-state" role="alert">
      <q-icon :name="mdiAlertCircleOutline" size="36px" color="negative" />
      <div class="pachi-admin-state__title">{{ schemaError }}</div>
      <q-btn flat no-caps type="button" color="primary" :label="t('pachiAdmin.common.retry')" @click="loadSchema" />
    </div>
    <template v-else>
      <header class="pachi-admin-model__head">
        <h2 class="pachi-admin-model__title">{{ modelTitle(schema) }}</h2>
        <q-space />
        <q-btn
          v-if="schema.permissions.add"
          unelevated
          no-caps
          type="button"
          color="primary"
          class="pachi-admin-model__add"
          :icon="mdiPlus"
          :label="t('pachiAdmin.table.add')"
          @click="openCreate"
        />
      </header>

      <div class="pachi-admin-toolbar">
        <q-input
          v-if="schema.list.search"
          v-model="search"
          class="pachi-admin-toolbar__search"
          :placeholder="t('pachiAdmin.table.search')"
          :aria-label="t('pachiAdmin.table.search')"
          clearable
          outlined
          dense
          debounce="350"
          @update:model-value="reloadFirstPage"
        >
          <template #prepend><q-icon :name="mdiMagnify" /></template>
        </q-input>
        <q-btn
          v-if="schema.list.filters.length"
          flat
          no-caps
          type="button"
          :icon="mdiFilterVariant"
          :label="activeFilterCount ? `${t('pachiAdmin.table.filters')} (${activeFilterCount})` : t('pachiAdmin.table.filters')"
          :color="showFilters || activeFilterCount ? 'primary' : undefined"
          @click="showFilters = !showFilters"
        />
        <q-space />
        <template v-if="selected.length">
          <span class="pachi-admin-toolbar__selected">{{ t('pachiAdmin.table.selected', { count: selected.length }) }}</span>
          <q-btn-dropdown
            v-if="allowedActions.length"
            unelevated
            no-caps
            color="primary"
            :label="t('pachiAdmin.table.actions')"
          >
            <q-list>
              <q-item
                v-for="action in allowedActions"
                :key="action.name"
                v-close-popup
                clickable
                @click="askAction(action)"
              >
                <q-item-section>{{ actionLabel(action) }}</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </template>
        <q-btn flat round dense type="button" :icon="mdiRefresh" :aria-label="t('pachiAdmin.table.refresh')" @click="load" />
      </div>

      <div v-if="showFilters && schema.list.filters.length" class="pachi-admin-filters">
        <template v-for="filter in schema.list.filters" :key="filter.field">
          <template v-if="filter.range">
            <div v-for="bound in RANGE_BOUNDS" :key="bound" class="pachi-admin-filters__item">
              <q-input
                :model-value="(filters[`${filter.field}__${bound}`] as string | number | null) ?? ''"
                :label="t(bound === 'gte' ? 'pachiAdmin.table.rangeFrom' : 'pachiAdmin.table.rangeTo', { label: filterLabel(filter) })"
                :type="filterInputType(filter.component)"
                :error="!!filterErrors[`${filter.field}__${bound}`]"
                :error-message="filterErrors[`${filter.field}__${bound}`]"
                stack-label
                clearable
                outlined
                dense
                no-error-icon
                debounce="400"
                @update:model-value="setFilter(`${filter.field}__${bound}`, $event)"
              />
            </div>
          </template>
          <div v-else class="pachi-admin-filters__item">
            <q-select
              v-if="filter.component === 'toggle'"
              :model-value="filters[filter.field] ?? null"
              :label="filterLabel(filter)"
              :options="booleanOptions"
              emit-value
              map-options
              outlined
              dense
              @update:model-value="setFilter(filter.field, $event)"
            />
            <q-select
              v-else-if="filter.component === 'select'"
              :model-value="filters[filter.field] ?? null"
              :label="filterLabel(filter)"
              :options="fieldOptions(filter)"
              clearable
              emit-value
              map-options
              outlined
              dense
              @update:model-value="setFilter(filter.field, $event)"
            />
            <pachi-admin-lookup
              v-else-if="filter.component === 'lookup' && filter.lookup"
              :model-value="(filters[filter.field] as AdminPk | null) ?? null"
              :lookup="filter.lookup"
              :label="filterLabel(filter)"
              :error="!!filterErrors[filter.field]"
              :error-message="filterErrors[filter.field]"
              @update:model-value="setFilter(filter.field, $event)"
            />
            <q-input
              v-else
              :model-value="(filters[filter.field] as string | number | null) ?? ''"
              :label="filterLabel(filter)"
              :type="filterInputType(filter.component)"
              :stack-label="filterInputType(filter.component) !== 'text'"
              :error="!!filterErrors[filter.field]"
              :error-message="filterErrors[filter.field]"
              clearable
              outlined
              dense
              no-error-icon
              debounce="400"
              @update:model-value="setFilter(filter.field, $event)"
            />
          </div>
        </template>
        <q-btn
          v-if="activeFilterCount"
          flat
          no-caps
          type="button"
          :label="t('pachiAdmin.table.clearFilters')"
          @click="clearFilters"
        />
      </div>

      <div v-if="flash" :class="['pachi-admin-banner', `pachi-admin-banner--${flash.type}`]" role="status">{{ flash.text }}</div>
      <div v-if="listError" class="pachi-admin-banner pachi-admin-banner--error" role="alert">{{ listError }}</div>

      <q-table
        v-model:selected="selected"
        v-model:pagination="pagination"
        class="pachi-admin-table"
        :rows="rows"
        :columns="columns"
        :row-key="schema.primaryKey"
        :loading="loading"
        :rows-per-page-options="[...PAGE_SIZE_OPTIONS]"
        :rows-per-page-label="t('pachiAdmin.table.rowsPerPage')"
        :pagination-label="paginationLabel"
        :no-data-label="hasCriteria ? t('pachiAdmin.table.noResults') : t('pachiAdmin.table.noData')"
        :selection="selectable ? 'multiple' : 'none'"
        flat
        bordered
        dense
        @request="onRequest"
        @row-click="onRowClick"
      >
        <template #header-cell="head">
          <q-th
            :props="head"
            :class="{ 'pachi-admin-th--sortable': isOrderable(head.col.name) }"
            :aria-sort="ariaSort(head.col.name)"
            :tabindex="isOrderable(head.col.name) ? 0 : undefined"
            @click="onSort(head.col.name, $event)"
            @keydown.enter.self.prevent="onSort(head.col.name, $event)"
            @keydown.space.self.prevent="onSort(head.col.name, $event)"
          >
            {{ head.col.label }}
            <template v-if="sortIndex(head.col.name) >= 0">
              <q-icon :name="sorts[sortIndex(head.col.name)]!.descending ? mdiArrowDown : mdiArrowUp" size="14px" />
              <sup v-if="sorts.length > 1" class="pachi-admin-th__prio">{{ sortIndex(head.col.name) + 1 }}</sup>
            </template>
          </q-th>
        </template>
        <template #body-cell="cell">
          <!-- by keyboard the row opens from the first cell (Enter/Space): the row click is not reachable -->
          <q-td
            :props="cell"
            :class="['pachi-admin-cell', cell.col.align === 'right' ? 'pachi-admin-cell--num' : '']"
            :tabindex="cell.col.name === columns[0]?.name ? 0 : undefined"
            @keydown.enter.self.prevent="openRow(cell.row)"
            @keydown.space.self.prevent="openRow(cell.row)"
          >
            <q-icon
              v-if="fieldOf(cell.col.name)?.type === 'boolean' && cell.value !== null && cell.value !== undefined"
              :name="cell.value ? mdiCheckCircle : mdiCloseCircleOutline"
              :color="cell.value ? 'positive' : 'grey'"
              size="18px"
              :aria-label="cell.value ? t('pachiAdmin.common.yes') : t('pachiAdmin.common.no')"
            />
            <span v-else class="pachi-admin-cell__text" :title="cellText(cell.row, cell.col.name)">{{ cellText(cell.row, cell.col.name) }}</span>
          </q-td>
        </template>
      </q-table>
    </template>

    <pachi-admin-form-dialog
      v-if="schema && dialog.open"
      v-model="dialog.open"
      :schema="schema"
      :mode="dialog.mode"
      :pk="dialog.pk"
      @saved="onSaved"
      @deleted="onDeleted"
    />

    <q-dialog v-model="confirm.open">
      <q-card class="pachi-admin-confirm">
        <q-card-section>
          <div class="pachi-admin-dialog__title">{{ t('pachiAdmin.actions.confirmTitle') }}</div>
          <p>{{ t('pachiAdmin.actions.confirmMessage', { action: confirm.label, count: confirm.count }) }}</p>
          <ul v-if="confirm.summary.shown.length" class="pachi-admin-confirm__labels">
            <li v-for="(label, i) in confirm.summary.shown" :key="i">{{ label }}</li>
            <li v-if="confirm.summary.more" class="pachi-admin-confirm__more">{{ t('pachiAdmin.actions.andMore', { count: confirm.summary.more }) }}</li>
          </ul>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps type="button" :label="t('pachiAdmin.common.cancel')" @click="confirm.open = false" />
          <q-btn unelevated no-caps type="button" color="primary" :label="t('pachiAdmin.common.confirm')" @click="runConfirmed" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  mdiAlertCircleOutline,
  mdiArrowDown,
  mdiArrowUp,
  mdiCheckCircle,
  mdiCloseCircleOutline,
  mdiFilterVariant,
  mdiMagnify,
  mdiPlus,
  mdiRefresh,
} from '@quasar/extras/mdi-v7'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import type {
  AdminComponentName,
  AdminPk,
  AdminRow,
  IAdminAction,
  IAdminFilter,
  IAdminSchema,
} from '../types/admin'
import PachiAdminFormDialog from './PachiAdminFormDialog.vue'
import PachiAdminLookup from './PachiAdminLookup.vue'
import { messages } from '../locales'
import { alignFor, formatCell } from '../helpers/format'
import { fieldKey } from '../helpers/model-key'
import type { AdminFormMode } from '../helpers/payload'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, filterQueryParams, nextSorts, parseOrdering } from '../helpers/query'
import type { IAdminSort } from '../helpers/query'
import { loadRowLabels, summarizeLabels } from '../helpers/row-labels'
import type { IRowLabelSummary } from '../helpers/row-labels'
import { actionLabel, fieldLabel, fieldOptions, modelTitle } from '../helpers/schema-text'
import { describeRequestError, useAdminApi } from '../helpers/use-admin'

/**
 * Model view: server-side table (search, sorting, pagination, filters), row selection with
 * bulk actions, create/edit dialog. Everything is driven by `GET .../_schema`.
 */
const props = defineProps<{
  app: string
  model: string
}>()

const { t, locale } = usePachiI18n(messages)
const api = useAdminApi()

const schema = ref<IAdminSchema | null>(null)
const schemaLoading = ref(false)
const schemaError = ref('')
const rows = ref<AdminRow[]>([])
const loading = ref(false)
const listError = ref('')
const selected = ref<AdminRow[]>([])
const search = ref('')
const filters = reactive<Record<string, unknown>>({})
const showFilters = ref(false)
const flash = ref<{ type: 'ok' | 'error', text: string } | null>(null)
const pagination = ref({
  page: 1,
  rowsPerPage: DEFAULT_PAGE_SIZE as number,
  sortBy: null as string | null,
  descending: false,
  rowsNumber: 0,
})
const dialog = reactive<{ open: boolean, mode: AdminFormMode, pk: AdminPk | null }>({ open: false, mode: 'edit', pk: null })
const sorts = ref<IAdminSort[]>([])
const filterErrors = ref<Record<string, string>>({})
const RANGE_BOUNDS = ['gte', 'lte'] as const
const confirm = reactive<{ open: boolean, label: string, action: IAdminAction | null, count: number, summary: IRowLabelSummary }>({
  open: false, label: '', action: null, count: 0, summary: { shown: [], more: 0 },
})

let flashTimer: ReturnType<typeof setTimeout> | undefined
let loadSeq = 0
let schemaSeq = 0

const booleanOptions = computed(() => [
  { label: t('pachiAdmin.common.any'), value: null },
  { label: t('pachiAdmin.common.yes'), value: true },
  { label: t('pachiAdmin.common.no'), value: false },
])

const activeFilterCount = computed(() => Object.values(filters).filter((v) => v !== null && v !== undefined && v !== '').length)
const hasCriteria = computed(() => !!search.value || activeFilterCount.value > 0)

const columns = computed(() => {
  const s = schema.value
  if (!s) return []
  return s.list.display
    .filter((name) => s.fields[name])
    .map((name) => ({
      name,
      label: fieldLabel(fieldKey(s.app, s.model, name), s.fields[name]!),
      field: name,
      align: alignFor(s.fields[name]!),
      sortable: s.list.orderFields.includes(name),
    }))
})

/** Actions shown: allowed by the backend and by the user permissions. */
const allowedActions = computed(() => {
  const s = schema.value
  if (!s) return []
  return s.actions.filter((a) => {
    if (a.allowed === false) return false
    const perm = a.permission as keyof IAdminSchema['permissions'] | undefined
    return !perm || s.permissions[perm] !== false
  })
})

/** Selection only if there are usable bulk actions. */
const selectable = computed(() => allowedActions.value.length > 0)

/** Schema field. */
function fieldOf(name: string) {
  return schema.value?.fields[name]
}

/** Text of a cell (formatters and types). */
function cellText(row: AdminRow, name: string): string {
  return schema.value ? formatCell(schema.value, name, row, String(locale.value)) : ''
}

/** Label of a filter. */
function filterLabel(filter: IAdminFilter): string {
  return fieldLabel(fieldKey(schema.value!.app, schema.value!.model, filter.field), filter)
}

/** `<input>` type of a filter. */
function filterInputType(component: AdminComponentName): string {
  if (component === 'number') return 'number'
  if (component === 'date') return 'date'
  if (component === 'datetime') return 'date'
  if (component === 'time') return 'time'
  return 'text'
}

/** Pagination "from-to of total" text. */
function paginationLabel(from: number, to: number, total: number): string {
  return t('pachiAdmin.table.records', { from, to, total })
}

/**
 * Shows a temporary message.
 *
 * @param type - outcome
 * @param text - text
 */
function notify(type: 'ok' | 'error', text: string): void {
  flash.value = { type, text }
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flash.value = null }, 6000)
}

/** Loads the model schema and prepares the default ordering and the list. */
async function loadSchema(): Promise<void> {
  // when switching from one model to another the slow response of the previous one must be discarded (schema and list)
  const seq = ++schemaSeq
  loadSeq++
  loading.value = false
  schemaLoading.value = true
  schemaError.value = ''
  schema.value = null
  rows.value = []
  selected.value = []
  search.value = ''
  for (const key of Object.keys(filters)) delete filters[key]
  showFilters.value = false
  dialog.open = false
  try {
    const s = await api.getSchema(props.app, props.model)
    if (seq !== schemaSeq) return
    schema.value = s
    sorts.value = s.list.ordering.map(parseOrdering).filter((o) => s.list.orderFields.includes(o.field))
    pagination.value = { page: 1, rowsPerPage: DEFAULT_PAGE_SIZE, sortBy: null, descending: false, rowsNumber: 0 }
    schemaLoading.value = false
    await load()
  } catch (err) {
    const message = (await describeRequestError(err, (k, p) => t(k, p ?? {}))).message
    if (seq === schemaSeq) schemaError.value = message
  } finally {
    if (seq === schemaSeq) schemaLoading.value = false
  }
}

/** Loads the current page of the list. */
async function load(): Promise<void> {
  const s = schema.value
  if (!s) return
  const seq = ++loadSeq
  loading.value = true
  listError.value = ''
  filterErrors.value = {}
  const p = pagination.value
  try {
    const res = await api.list(s.app, s.model, {
      page: p.page,
      pageSize: p.rowsPerPage,
      sorts: sorts.value,
      search: search.value,
      filters: filterQueryParams(s.list.filters, filters),
    })
    if (seq !== loadSeq) return
    rows.value = res.items
    pagination.value = { ...p, page: res.page, rowsNumber: res.total }
    selected.value = []
  } catch (err) {
    if (seq !== loadSeq) return
    const d = await describeRequestError(err, (k, p2) => t(k, p2 ?? {}))
    if (seq !== loadSeq) return
    filterErrors.value = d.fields
    listError.value = d.message
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

/** QTable request (page and size: sorting is handled by the headers). */
function onRequest(req: { pagination: { page: number, rowsPerPage: number } }): void {
  pagination.value = { ...pagination.value, page: req.pagination.page, rowsPerPage: req.pagination.rowsPerPage }
  void load()
}

/** The column is sortable (`orderFields`). */
function isOrderable(name: string): boolean {
  return !!schema.value?.list.orderFields.includes(name)
}

/** Position of the column in the ordering (-1 if absent). */
function sortIndex(name: string): number {
  return sorts.value.findIndex((s) => s.field === name)
}

/** `aria-sort` value of a column. */
function ariaSort(name: string): 'ascending' | 'descending' | undefined {
  const i = sortIndex(name)
  return i < 0 ? undefined : sorts.value[i]!.descending ? 'descending' : 'ascending'
}

/**
 * Click on a header: single sort; with Shift the multiple sort accumulates.
 *
 * @param name - column
 * @param evt - click event
 */
function onSort(name: string, evt: Event): void {
  if (!isOrderable(name)) return
  sorts.value = nextSorts(sorts.value, name, (evt as MouseEvent).shiftKey === true)
  reloadFirstPage()
}

/** Reloads from the first page (search and filters). */
function reloadFirstPage(): void {
  pagination.value = { ...pagination.value, page: 1 }
  void load()
}

/**
 * Sets a filter and reloads.
 *
 * @param name - field
 * @param value - value (empty = removed)
 */
function setFilter(name: string, value: unknown): void {
  if (value === null || value === undefined || value === '') delete filters[name]
  else filters[name] = value
  reloadFirstPage()
}

/** Clears all filters. */
function clearFilters(): void {
  for (const key of Object.keys(filters)) delete filters[key]
  reloadFirstPage()
}

/** Opens the create dialog. */
function openCreate(): void {
  dialog.mode = 'create'
  dialog.pk = null
  dialog.open = true
}

/** Opens the edit/detail dialog on a row click. */
function onRowClick(evt: Event, row: AdminRow): void {
  if ((evt.target as HTMLElement | null)?.closest('.q-checkbox')) return
  openRow(row)
}

/** Opens the edit/detail dialog of a row (click or keyboard). */
function openRow(row: AdminRow): void {
  if (!schema.value) return
  dialog.mode = 'edit'
  dialog.pk = row[schema.value.primaryKey] as AdminPk
  dialog.open = true
}

/** Row saved: message and reload. */
function onSaved(payload: { mode: AdminFormMode }): void {
  notify('ok', t(payload.mode === 'create' ? 'pachiAdmin.form.created' : 'pachiAdmin.form.saved'))
  void load()
}

/** Row deleted: message and reload. */
function onDeleted(): void {
  notify('ok', t('pachiAdmin.form.deleted'))
  void load()
}

/** Starts a bulk action (with confirmation if required). */
function askAction(action: IAdminAction): void {
  if (action.confirm) {
    confirm.label = actionLabel(action)
    confirm.action = action
    confirm.count = selected.value.length
    confirm.summary = { shown: [], more: 0 }
    confirm.open = true
    const s = schema.value!
    const ids = selected.value.map((r) => r[s.primaryKey] as AdminPk)
    // a single `_options?ids=` call to show the titles of the involved rows
    void loadRowLabels(api, s.app, s.model, ids).then((labels) => {
      if (confirm.open && confirm.action === action) confirm.summary = summarizeLabels(labels, ids.length)
    })
  } else {
    void runAction(action)
  }
}

/** Runs the confirmed action. */
function runConfirmed(): void {
  confirm.open = false
  if (confirm.action) void runAction(confirm.action)
}

/**
 * Runs a bulk action on the selected rows.
 *
 * @param action - schema action
 */
async function runAction(action: IAdminAction): Promise<void> {
  const s = schema.value
  if (!s || !selected.value.length) return
  const ids = selected.value.map((r) => r[s.primaryKey] as AdminPk)
  try {
    const res = await api.runAction(s.app, s.model, action.name, ids)
    notify('ok', res.message || t('pachiAdmin.actions.done', { affected: res.affected }))
    await load()
  } catch (err) {
    notify('error', (await describeRequestError(err, (k, p) => t(k, p ?? {}))).message)
  }
}

watch(() => [props.app, props.model], () => void loadSchema(), { immediate: true })
onBeforeUnmount(() => clearTimeout(flashTimer))
</script>

<style lang="scss" src="../styles/admin.scss"></style>
