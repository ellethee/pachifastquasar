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
 * Universal field-driven section for `@ilpachi/pachi-kit/edit-dialog`:
 * wraps `useSection()` and renders `props.rows` (array of rows of
 * `IFieldDef`, declarative field vocabulary) through {@link ./DynamicField.vue}.
 *
 * To be passed as the `component` of an `ISectionDefinition` with
 * `props: { rows: entityFields }` and `initialValue: item ?? {}`.
 *
 * The state contains ONLY the fields declared in `rows` (copied from `initialValue` if present): the
 * record's extra keys do not enter `getResults()`, so several sections on the same record do not
 * overwrite each other when the results are merged. `initialValue` is reactive (even
 * if it arrives after mount) like the `initialValue` option of `useSection`.
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

/** Copies from `source` only the fields declared in `rows` and present in the record. */
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

// Avoids rebuilding the baseline (losing changes) if the parent passes a new but equal object.
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

// --- dependsOn: reset the value of dependent fields when the user changes a dependency ------
/**
 * Applies the user's change and clears the fields that depend on `name` (unless
 * `resetOnDependencyChange: false`). Only changes from the UI clear: loading a
 * record (`initialValue`) or `reset()` do not touch the values.
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

// --- validation ----------------------------------------------------------------------------------
const fieldRefs = new Map<string, { validate: () => boolean }>()
function setFieldRef(name: string, el: Element | ComponentPublicInstance | null): void {
  if (el) fieldRefs.set(name, el as unknown as { validate: () => boolean })
  else fieldRefs.delete(name)
}

/**
 * Validates all the fields (`required` and `rules`), shows the errors right away even on untouched fields
 * and notifies which fields are invalid (useful for custom components without an error UI).
 *
 * @returns `true` if all the fields are valid
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
      // Notify plugin not installed: the errors shown in the fields remain
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
