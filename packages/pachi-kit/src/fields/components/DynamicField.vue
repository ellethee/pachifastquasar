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
 * Dynamically renders ONE form field from its `IFieldDef`
 * (declarative field vocabulary): `text`/`textarea`
 * via `q-input`, `select` (local or remote, with filter and on-the-fly creation)
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
  /** Current values of the section: needed by `dependsOn`/`params` (passed by `FieldsSection`). */
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

/** `type: 'boolean'` uses the toggle, unless a custom `component` is set (which takes precedence). */
const isBoolean = computed(() => props.field.type === 'boolean' && !props.field.component)

/** Standard select handled here (not a custom `component`). */
const isSelect = computed(() => props.field.type === 'select' && !props.field.component)
// reactive: follows changes of `field.url`/`type`/`options`
const remoteSelect = useRemoteSelect(
  () => props.field,
  () => props.values,
)

const fieldComponent = computed(() => {
  // `component`: a custom Vue component (v-model + the other keys as props), e.g. FlagsInput/EnumSelect.
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

/** Declarative vocabulary keys handled here and NOT to be passed on to the underlying component. */
const RESERVED_KEYS = new Set(['field', 'type', 'url', 'optionLabel', 'optionValue', 'options', 'component',
  'dependsOn', 'params', 'resetOnDependencyChange'])
// (with `component` the `options`/`optionLabel`/... keys go to the component: see bindProps)

/** Effective rules: `required` (if set) followed by `field.rules`. */
const effectiveRules = computed<((val: unknown) => boolean | string)[]>(() => {
  const requiredRule = (val: unknown): boolean | string =>
    !isEmptyValue(val) || t('pachiEditDialogFields.required')
  return [...(props.field.required ? [requiredRule] : []), ...(props.field.rules ?? [])]
})

const inner = ref<{ validate?: () => unknown } | null>(null)

/**
 * Validates the field (`required` + `rules`, synchronous) and, if the underlying component exposes
 * `validate()` (q-input, q-select, ...), shows its error right away even without interaction.
 *
 * @returns `true` if the value satisfies all the rules
 */
function validate(): boolean {
  const value = valueForValidation(props.field, props.modelValue)
  const valid = effectiveRules.value.every((rule) => rule(value) === true)
  try {
    inner.value?.validate?.()
  } catch {
    // the custom component does not support validate(): the rules result stands
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
    // Custom component: we pass it `options` (if present) and nothing else of the select vocabulary.
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
 * `filter`/`new-value` are only needed by the standard q-selects handled below (not q-input/PachiDatePicker). A custom component
 * (`field.component`: FlagsInput, EnumSelect, the pickers...) already has its own q-select with its own
 * listeners: passing these too would merge them into an array (warning "Expected Function, got
 * Array") and make the filter's `update()` run twice.
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
