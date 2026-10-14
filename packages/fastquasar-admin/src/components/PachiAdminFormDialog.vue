<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)">
    <q-card class="pachi-admin-dialog">
      <q-card-section class="pachi-admin-dialog__head">
        <div class="pachi-admin-dialog__title">{{ title }}</div>
        <q-space />
        <q-btn flat round dense type="button" :icon="mdiClose" :aria-label="t('pachiAdmin.common.close')" @click="close" />
      </q-card-section>

      <q-tabs
        v-if="showHistory"
        v-model="tab"
        dense
        align="left"
        class="pachi-admin-dialog__tabs"
        active-color="primary"
        no-caps
      >
        <q-tab name="data" :label="t('pachiAdmin.form.tabData')" />
        <q-tab name="history" :label="t('pachiAdmin.form.tabHistory')" />
      </q-tabs>

      <q-card-section class="pachi-admin-dialog__body">
        <div v-if="loading" class="pachi-admin-state">
          <q-spinner size="28px" color="primary" />
          <div>{{ t('pachiAdmin.common.loading') }}</div>
        </div>
        <div v-else-if="loadError" class="pachi-admin-banner pachi-admin-banner--error" role="alert">
          {{ loadError }}
        </div>
        <template v-else>
          <pachi-admin-history v-if="showHistory && tab === 'history' && pk !== null" :schema="schema" :pk="pk as AdminPk" />
          <q-form v-show="tab === 'data'" class="pachi-admin-form" novalidate @submit.prevent="submit">
            <div v-if="readOnlyForm && mode === 'edit'" class="pachi-admin-banner pachi-admin-banner--info">
              {{ t('pachiAdmin.form.readonlyNote') }}
            </div>
            <div v-if="formError" class="pachi-admin-banner pachi-admin-banner--error" role="alert">{{ formError }}</div>
            <div class="pachi-admin-form__grid">
              <pachi-admin-field
                v-for="name in names"
                :key="name"
                v-model="values[name]"
                :class="{ 'pachi-admin-form__wide': isWide(name) }"
                :schema="schema"
                :name="name"
                :field="schema.fields[name]!"
                :label="labelOf(name)"
                :readonly="isReadonly(name)"
                :error="errors[name] ?? ''"
              />
            </div>
          </q-form>
        </template>
      </q-card-section>

      <q-card-actions class="pachi-admin-dialog__actions">
        <q-btn
          v-if="mode === 'edit' && canDelete"
          flat
          no-caps
          type="button"
          color="negative"
          :icon="mdiDeleteOutline"
          :label="t('pachiAdmin.form.delete')"
          :disable="busy || loading"
          @click="askDelete"
        />
        <q-space />
        <q-btn flat no-caps type="button" :label="t('pachiAdmin.common.close')" :disable="busy" @click="close" />
        <q-btn
          v-if="!readOnlyForm"
          unelevated
          no-caps
          type="button"
          color="primary"
          :label="mode === 'create' ? t('pachiAdmin.form.create') : t('pachiAdmin.form.save')"
          :loading="busy"
          :disable="loading || !!loadError"
          @click="submit"
        />
      </q-card-actions>

      <q-dialog v-model="confirmDelete">
        <q-card class="pachi-admin-confirm">
          <q-card-section>
            <div class="pachi-admin-dialog__title">{{ t('pachiAdmin.form.deleteTitle') }}</div>
            <p>{{ t('pachiAdmin.form.deleteConfirm') }}</p>
            <ul v-if="deleteLabels.length" class="pachi-admin-confirm__labels">
              <li v-for="(label, i) in deleteLabels" :key="i">{{ label }}</li>
            </ul>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat no-caps type="button" :label="t('pachiAdmin.common.cancel')" @click="confirmDelete = false" />
            <q-btn unelevated no-caps type="button" color="negative" :label="t('pachiAdmin.form.delete')" :loading="busy" @click="remove" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { mdiClose, mdiDeleteOutline } from '@quasar/extras/mdi-v7'
import { computed, reactive, ref, watch } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import type { AdminPk, AdminRow, IAdminSchema } from '../types/admin'
import PachiAdminField from './PachiAdminField.vue'
import PachiAdminHistory from './PachiAdminHistory.vue'
import { messages } from '../locales'
import { fieldKey } from '../helpers/model-key'
import { buildPayload, formFieldNames, initialFormValues, isWritable } from '../helpers/payload'
import type { AdminFormMode, AdminFormValues } from '../helpers/payload'
import { fieldLabel, modelTitle } from '../helpers/schema-text'
import { loadRowLabels } from '../helpers/row-labels'
import { describeRequestError, useAdminApi } from '../helpers/use-admin'

/**
 * Dialogo di creazione / modifica / dettaglio di una riga, generato dallo schema. In modifica carica la riga
 * (`GET`), invia con `PATCH` solo i campi cambiati, mostra gli errori 422 sul campo e la cronologia in un tab.
 */
const props = defineProps<{
  modelValue: boolean
  schema: IAdminSchema
  mode: AdminFormMode
  /** Chiave primaria della riga (modifica). */
  pk?: AdminPk | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  /** Riga creata o modificata: la lista va ricaricata. */
  (e: 'saved', payload: { mode: AdminFormMode, row: AdminRow }): void
  /** Riga eliminata. */
  (e: 'deleted', pk: AdminPk): void
}>()

const { t } = usePachiI18n(messages)
const api = useAdminApi()

const values = reactive<AdminFormValues>({})
const initial = ref<AdminFormValues>({})
const original = ref<AdminRow | null>(null)
const errors = ref<Record<string, string>>({})
const formError = ref('')
const loadError = ref('')
const loading = ref(false)
const busy = ref(false)
const tab = ref<'data' | 'history'>('data')
const confirmDelete = ref(false)
const deleteLabels = ref<string[]>([])

const names = computed(() => formFieldNames(props.schema, props.mode))
const canChange = computed(() => props.schema.permissions.change)
const canDelete = computed(() => props.schema.permissions.delete)
/** Dettaglio in sola lettura: modifica senza permesso `change`. */
const readOnlyForm = computed(() => props.mode === 'edit' && !canChange.value)
const showHistory = computed(
  () => props.mode === 'edit' && props.schema.history && props.schema.permissions.view && props.pk != null
)
const title = computed(() => {
  const model = modelTitle(props.schema)
  if (props.mode === 'create') return t('pachiAdmin.form.createTitle', { model })
  return t(readOnlyForm.value ? 'pachiAdmin.form.viewTitle' : 'pachiAdmin.form.editTitle', { model })
})

/** Etichetta (con asterisco per i campi obbligatori in creazione). */
function labelOf(name: string): string {
  const field = props.schema.fields[name]!
  const base = fieldLabel(fieldKey(props.schema.app, props.schema.model, name), field)
  return props.mode === 'create' && field.required ? `${base} *` : base
}

/** Campo non modificabile. */
function isReadonly(name: string): boolean {
  return readOnlyForm.value || !isWritable(props.schema.fields[name]!)
}

/** Campi che occupano tutta la riga. */
function isWide(name: string): boolean {
  const c = props.schema.fields[name]!.component
  return c === 'textarea' || c === 'json'
}

/**
 * Riempie il form con i valori della riga (o i default).
 *
 * @param row - riga caricata, assente in creazione
 */
function fill(row: AdminRow | null): void {
  const next = initialFormValues(props.schema, row)
  for (const key of Object.keys(values)) delete values[key]
  Object.assign(values, next)
  initial.value = { ...next }
  original.value = row
}

/** Prepara il dialogo all'apertura. */
async function open(): Promise<void> {
  errors.value = {}
  formError.value = ''
  loadError.value = ''
  tab.value = 'data'
  confirmDelete.value = false
  if (props.mode === 'create' || props.pk == null) {
    fill(null)
    return
  }
  loading.value = true
  try {
    fill(await api.get(props.schema.app, props.schema.model, props.pk))
  } catch (err) {
    loadError.value = (await describeRequestError(err, (k, p) => t(k, p ?? {}))).message
  } finally {
    loading.value = false
  }
}

/** Apre la conferma di eliminazione mostrando il titolo della riga (`_options?ids=`). */
function askDelete(): void {
  deleteLabels.value = []
  confirmDelete.value = true
  if (props.pk == null) return
  void loadRowLabels(api, props.schema.app, props.schema.model, [props.pk]).then((labels) => {
    deleteLabels.value = labels.slice(0, 1)
  })
}

/** Chiude il dialogo. */
function close(): void {
  emit('update:modelValue', false)
}

/**
 * Applica a form e banner l'errore di una richiesta di scrittura.
 *
 * @param err - errore lanciato
 */
async function showError(err: unknown): Promise<void> {
  const d = await describeRequestError(err, (k, p) => t(k, p ?? {}))
  errors.value = { ...d.fields }
  formError.value = d.message
}

/** Valida, invia (POST o PATCH con i soli campi cambiati) e chiude. */
async function submit(): Promise<void> {
  if (busy.value || readOnlyForm.value) return
  errors.value = {}
  formError.value = ''
  const { payload, errors: clientErrors } = buildPayload(props.schema, values, props.mode, initial.value, original.value)
  if (Object.keys(clientErrors).length) {
    errors.value = Object.fromEntries(Object.entries(clientErrors).map(([k, c]) => [k, t(`pachiAdmin.form.${c}`)]))
    formError.value = t('pachiAdmin.errors.validation')
    return
  }
  if (props.mode === 'edit' && !Object.keys(payload).length) {
    formError.value = t('pachiAdmin.form.noChanges')
    return
  }
  busy.value = true
  try {
    const row = props.mode === 'create'
      ? await api.create(props.schema.app, props.schema.model, payload)
      : await api.update(props.schema.app, props.schema.model, props.pk as AdminPk, payload)
    emit('saved', { mode: props.mode, row })
    close()
  } catch (err) {
    await showError(err)
  } finally {
    busy.value = false
  }
}

/** Elimina la riga dopo la conferma. */
async function remove(): Promise<void> {
  if (busy.value || props.pk == null) return
  busy.value = true
  try {
    await api.remove(props.schema.app, props.schema.model, props.pk)
    confirmDelete.value = false
    emit('deleted', props.pk)
    close()
  } catch (err) {
    confirmDelete.value = false
    await showError(err)
  } finally {
    busy.value = false
  }
}

watch(() => props.modelValue, (isOpen) => { if (isOpen) void open() }, { immediate: true })
</script>
