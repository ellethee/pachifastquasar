<template>
  <div class="pachi-fields-section column q-gutter-sm">
    <div
      v-for="(row, rowIndex) in rows"
      :key="rowIndex"
      class="pachi-fields-row row q-gutter-md items-start fit"
    >
      <dynamic-field
        v-for="fieldDef in row"
        :key="fieldDef.field"
        :ref="(el) => setFieldRef(fieldDef.field, el)"
        :model-value="state[fieldDef.field]"
        :field="fieldDef"
        :values="state"
        :readonly="readonly"
        @update:model-value="onFieldInput(fieldDef.field, $event)"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
/**
 * module FieldsSection.vue
 *
 * Sezione universale field-driven per `@ilpachi/pachi-kit/edit-dialog`:
 * avvolge `useSection()` e renderizza `props.rows` (array di righe di
 * `IFieldDef`, vocabolario dichiarativo dei campi) tramite {@link ./DynamicField.vue}.
 *
 * Da passare come `component` di una `ISectionDefinition` con
 * `props: { rows: entitaFields }` e `initialValue: item ?? {}`.
 *
 * Lo stato contiene SOLO i campi dichiarati in `rows` (copiati da `initialValue` se presenti): le
 * chiavi extra del record non entrano in `getResults()`, quindi più sezioni sullo stesso record non
 * si sovrascrivono a vicenda quando i risultati vengono uniti. `initialValue` è reattivo (anche
 * se arriva dopo il mount) come l'opzione `initialValue` di `useSection`.
 */
import { watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useSection } from '../../edit-dialog'
import DynamicField from './DynamicField.vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { normalizeAgainstOriginal } from '../helpers/coerce'
import { resolveQuasar, showNotify } from '../helpers/quasar-instance'
import { dependencyNames, isEmptyValue } from '../helpers/remote-query'
import { messages } from '../locales'
import type { IFieldRow, IFieldsState } from '../types'

const props = defineProps<{
  rows: IFieldRow[]
  initialValue?: IFieldsState
  readonly?: boolean
}>()

/** Copia da `source` solo i campi dichiarati in `rows` e presenti nel record. */
function pickDeclared(source: IFieldsState | undefined): IFieldsState {
  const out: IFieldsState = {}
  if (!source) return out
  for (const row of props.rows) {
    for (const def of row) {
      if (def.field in source) out[def.field] = source[def.field]
    }
  }
  return out
}

// Evita di rifare il baseline (perdendo le modifiche) se il genitore passa un oggetto nuovo ma uguale.
let lastPicked: IFieldsState | undefined
let lastPickedJson = ''
function initialPicked(): IFieldsState | undefined {
  if (!props.initialValue) return undefined
  const picked = pickDeclared(props.initialValue)
  const json = JSON.stringify(picked)
  if (lastPicked && json === lastPickedJson) return lastPicked
  lastPicked = picked
  lastPickedJson = json
  return picked
}

const { t } = usePachiI18n(messages)
const $q = resolveQuasar()

const { state, originalState, reset, setOriginalState, commit, getResults, hasChanges } =
  useSection<IFieldsState>(initialPicked() ?? {}, { initialValue: initialPicked })

// --- dependsOn: reset del valore dei campi dipendenti quando l'utente cambia una dipendenza ------
/**
 * Applica la modifica dell'utente e azzera i campi che dipendono da `name` (salvo
 * `resetOnDependencyChange: false`). Solo le modifiche dalla UI azzerano: il caricamento di un
 * record (`initialValue`) o `reset()` non toccano i valori.
 */
function onFieldInput(name: string, value: unknown): void {
  const next = normalizeAgainstOriginal(originalState.value[name], value)
  const changed = JSON.stringify(state.value[name]) !== JSON.stringify(next)
  state.value[name] = next
  if (!changed) return
  for (const def of props.rows.flat()) {
    if (def.resetOnDependencyChange === false || !dependencyNames(def).includes(name)) continue
    if (!isEmptyValue(state.value[def.field])) state.value[def.field] = def.multiple ? [] : null
  }
}

// --- validazione ----------------------------------------------------------------------------------
const fieldRefs = new Map<string, { validate: () => boolean }>()
function setFieldRef(name: string, el: Element | ComponentPublicInstance | null): void {
  if (el) fieldRefs.set(name, el as unknown as { validate: () => boolean })
  else fieldRefs.delete(name)
}

/**
 * Valida tutti i campi (`required` e `rules`), mostra gli errori subito anche sui campi non toccati
 * e notifica quali campi non sono validi (utile per componenti custom senza UI d'errore).
 *
 * @returns `true` se tutti i campi sono validi
 */
function validate(): boolean {
  const invalid: string[] = []
  for (const row of props.rows) {
    for (const def of row) {
      const ref = fieldRefs.get(def.field)
      if (ref && !ref.validate()) invalid.push(def.label || def.field)
    }
  }
  if (invalid.length) {
    try {
      showNotify($q, {
        type: 'negative',
        message: t('pachiEditDialogFields.invalidFields', { labels: invalid.join(', ') }),
      })
    } catch {
      // plugin Notify non installato: restano gli errori mostrati nei campi
    }
  }
  return invalid.length === 0
}

defineExpose({
  reset,
  setOriginalState,
  commit,
  getResults,
  hasChanges: () => hasChanges.value,
  validate,
  name: 'FieldsSection',
})
</script>
