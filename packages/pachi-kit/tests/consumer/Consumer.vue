<template>
  <div>
    <pachi-table2
      url="/items"
      :columns="columns"
      :can-edit="canEditRow"
      @pt2:data="onData"
      @pt2:loaded="onLoaded"
      @pt2:load-error="onError"
      @pt2:update:multi-sort="onSort"
      @pt2:request="onRequest"
      @pt2:edit-item="onEdit"
      @pt2:delete-item="onDelete"
      @pt2:record-created="onRecords"
      @pt2:record-updated="onRecords"
      @pt2:record-deleted="onRecords"
      @row-dblclick="onDblClick"
    >
      <template #toolbar-actions="{ api }">
        <q-btn @click="api.reload()" />
      </template>
    </pachi-table2>
    <pachi-date-picker v-model="date" label="Data" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { QTableColumn } from 'quasar'
import { PachiDatePicker, PachiConfirmDialog, PachiPopupEdit } from '@ilpachi/pachi-kit/ui'
import { PachiDialog } from '@ilpachi/pachi-kit/dialog'
import { PachiEditDialog } from '@ilpachi/pachi-kit/edit-dialog'
import { DynamicField, FieldsSection } from '@ilpachi/pachi-kit/fields'
import { PachiTable2 } from '@ilpachi/pachi-kit/table'
import type {
  IOrderState,
  IPaginatedResponse,
  PachiTable2Api,
  PachiTable2LoadedEvent,
} from '@ilpachi/pachi-kit/table'
import { PachiUploader } from '@ilpachi/pachi-kit/uploader'

interface Row {
  id: number
  name: string
}

const columns: QTableColumn[] = [{ name: 'name', label: 'Nome', field: 'name' }]
const date = ref<string | undefined>(undefined)
const text = ref('')

/** Fissa il tipo di riga `T` della tabella (come nelle app reali). */
function canEditRow(row: Row): boolean {
  return row.id > 0
}

/** Listener tipizzati: se i d.ts degradano a `never` la compilazione fallisce. */
function onData(response: IPaginatedResponse<Row>): void {
  void response.items
}
function onLoaded(event: PachiTable2LoadedEvent<Row>): void {
  void event
}
function onError(error: unknown): void {
  void error
}
function onSort(state: IOrderState[]): void {
  void state
}
function onRequest(filter: string): void {
  void filter
}
function onEdit(row: Row, api: PachiTable2Api<Row>): void {
  void row.name
  void api.reload()
}
function onDelete(row: Row, api: PachiTable2Api<Row>): void {
  void row.id
  void api.reload()
}
function onRecords(records: Row[]): void {
  void records.length
}
function onDblClick(evt: Event, row: unknown): void {
  void evt
  void row
}

void [PachiConfirmDialog, PachiPopupEdit, PachiDialog, PachiEditDialog, PachiUploader, DynamicField, FieldsSection, text]
</script>
