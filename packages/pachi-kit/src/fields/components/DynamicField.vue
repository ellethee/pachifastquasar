<template>
  <q-toggle
    v-if="isBoolean"
    ref="inner"
    v-model="model"
    :label="field.required ? `${field.label} *` : field.label"
    :disable="readonly"
    class="col-grow"
  />
  <component
    :is="fieldComponent"
    v-else
    ref="inner"
    v-model="model"
    :readonly="readonly"
    outlined
    dense
    stack-label
    class="col-grow"
    v-bind="bindProps"
    v-on="fieldListeners"
  />
</template>
<script setup lang="ts">
/**
 * module DynamicField.vue
 *
 * Renderizza dinamicamente UN campo del form a partire dal suo `IFieldDef`
 * (vocabolario dichiarativo dei campi): `text`/`textarea`
 * via `q-input`, `select` (locale o remoto, con filtro e creazione al volo)
 * via `q-select`, `pdate` via `PachiDatePicker`.
 */
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import { QInput, QSelect, QToggle } from 'quasar'
import { PachiDatePicker } from '../../ui'
import type { IFieldDef, IFieldsState } from '../types'
import { isEmptyValue } from '../helpers/remote-query'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { useRemoteSelect } from '../composables/use-remote-select'
import { coerce, valueForValidation } from '../helpers/coerce'
import { messages } from '../locales'

const props = defineProps<{
  modelValue: unknown
  field: IFieldDef
  readonly?: boolean | undefined
  /** Valori correnti della sezione: servono a `dependsOn`/`params` (le passa `FieldsSection`). */
  values?: IFieldsState | undefined
}>()
const emit = defineEmits<{
  'update:modelValue': [unknown]
}>()

const model = computed({
  get: () => props.modelValue,
  set: (value: unknown) => emit('update:modelValue', coerce(props.field, value)),
})

const { t } = usePachiI18n(messages)

/** `type: 'boolean'` usa il toggle, salvo `component` custom (che ha la precedenza). */
const isBoolean = computed(() => props.field.type === 'boolean' && !props.field.component)

/** Select standard gestito qui (non un `component` custom). */
const isSelect = computed(() => props.field.type === 'select' && !props.field.component)
// reattivo: segue i cambi di `field.url`/`type`/`options`
const remoteSelect = useRemoteSelect(
  () => props.field,
  () => props.values,
)

const fieldComponent = computed(() => {
  // `component`: un componente Vue custom (v-model + le altre chiavi come prop), es. FlagsInput/EnumSelect.
  if (props.field.component) return props.field.component as Component
  switch (props.field.type) {
    case 'select':
      return QSelect
    case 'pdate':
      return PachiDatePicker
    case 'textarea':
    case 'number':
    case 'text':
    default:
      return QInput
  }
})

/** Chiavi del vocabolario dichiarativo gestite qui e NON da ripassare al componente sottostante. */
const RESERVED_KEYS = new Set(['field', 'type', 'url', 'optionLabel', 'optionValue', 'options', 'component',
  'dependsOn', 'params', 'resetOnDependencyChange'])
// (con `component` le chiavi `options`/`optionLabel`/... vanno al componente: vedi bindProps)

/** Regole effettive: `required` (se impostato) seguita da `field.rules`. */
const effectiveRules = computed<((val: unknown) => boolean | string)[]>(() => {
  const requiredRule = (val: unknown): boolean | string =>
    !isEmptyValue(val) || t('pachiEditDialogFields.required')
  return [...(props.field.required ? [requiredRule] : []), ...(props.field.rules ?? [])]
})

const inner = ref<{ validate?: () => unknown } | null>(null)

/**
 * Valida il campo (`required` + `rules`, sincrone) e, se il componente sottostante espone
 * `validate()` (q-input, q-select, ...), ne mostra l'errore subito anche senza interazione.
 *
 * @returns `true` se il valore rispetta tutte le regole
 */
function validate(): boolean {
  const value = valueForValidation(props.field, props.modelValue)
  const valid = effectiveRules.value.every((rule) => rule(value) === true)
  try {
    inner.value?.validate?.()
  } catch {
    // il componente custom non supporta validate(): resta il risultato delle regole
  }
  return valid
}

defineExpose({ validate })

const bindProps = computed(() => {
  const extra: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props.field)) {
    if (!RESERVED_KEYS.has(key)) extra[key] = value
  }
  if (props.field.component) {
    // Componente custom: gli riportiamo `options` (se presenti) e nient'altro del vocabolario select.
    if (props.field.options) extra.options = props.field.options
    return extra
  }
  if (props.field.type === 'textarea') extra.type = 'textarea'
  if (props.field.type === 'number') extra.type = 'number'
  if (isSelect.value) {
    extra.options = remoteSelect.options.value
    extra.optionLabel = typeof props.field.optionLabel === 'function' ? props.field.optionLabel : (props.field.optionLabel ?? 'label')
    extra.optionValue = props.field.optionValue ?? 'value'
    extra.loading = remoteSelect.loading.value
    extra.emitValue = true
    extra.mapOptions = true
  }
  if (props.field.required || props.field.rules?.length) extra.rules = effectiveRules.value
  if (props.field.required) {
    extra.label = `${props.field.label} *`
  }
  if (props.field.type === 'pdate' && !extra.mask) {
    extra.mask = 'YYYY-MM-DD'
  }
  return extra
})

/**
 * `filter`/`new-value` servono solo ai q-select standard gestiti qui sotto (non a q-input/PachiDatePicker). Un componente custom
 * (`field.component`: FlagsInput, EnumSelect, i picker...) ha già il proprio q-select con i propri
 * listener: passargli anche questi li fonderebbe in un array (warning "Expected Function, got
 * Array") e farebbe girare due volte `update()` del filtro.
 */
const fieldListeners = computed(() =>
  isSelect.value ? { filter: onFilter, 'new-value': onNewValue } : {},
)

function onFilter(val: string, update: (callbackFn: () => void) => void) {
  if (isSelect.value) remoteSelect.filterFn(val, update)
  else update(() => {})
}

function onNewValue(val: string, done: (value: unknown, mode?: 'add' | 'add-unique' | 'toggle') => void) {
  if (isSelect.value && props.field.useInput) remoteSelect.createValueFn(val, done)
}
</script>
