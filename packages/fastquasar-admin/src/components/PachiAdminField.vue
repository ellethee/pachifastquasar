<template>
  <component
    :is="custom"
    v-if="custom"
    :model-value="modelValue"
    :field="field"
    :name="name"
    :label="label"
    :readonly="readonly"
    :error="error"
    :schema="schema"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <div v-else-if="field.component === 'toggle'" class="pachi-admin-field pachi-admin-field--toggle">
    <q-toggle
      :model-value="modelValue as boolean | null"
      :label="label"
      :disable="readonly"
      :toggle-indeterminate="!!field.nullable"
      color="primary"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <div v-if="error" class="pachi-admin-field__error" role="alert">{{ error }}</div>
  </div>
  <pachi-admin-lookup
    v-else-if="field.component === 'lookup' && field.lookup"
    class="pachi-admin-field"
    :model-value="modelValue as AdminPk | null"
    :lookup="field.lookup"
    :label="label"
    :disable="readonly"
    :clearable="!!field.nullable"
    :error="!!error"
    :error-message="error"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <q-select
    v-else-if="field.component === 'select'"
    class="pachi-admin-field"
    :model-value="modelValue"
    :label="label"
    :options="selectOptions"
    :disable="readonly"
    :clearable="!!field.nullable && !readonly"
    :error="!!error"
    :error-message="error"
    emit-value
    map-options
    outlined
    dense
    no-error-icon
    @update:model-value="emit('update:modelValue', $event)"
  />
  <q-input
    v-else-if="field.component === 'number'"
    class="pachi-admin-field"
    :model-value="modelValue as string | number | null"
    :label="label"
    :disable="readonly"
    :min="field.properties?.min"
    :max="field.properties?.max"
    :step="field.properties?.step"
    :clearable="!!field.nullable && !readonly"
    :error="!!error"
    :error-message="error"
    type="number"
    outlined
    dense
    no-error-icon
    @update:model-value="emit('update:modelValue', $event)"
  />
  <q-input
    v-else-if="field.component === 'date' || field.component === 'datetime' || field.component === 'time'"
    class="pachi-admin-field"
    :model-value="modelValue as string | null"
    :label="label"
    :type="field.component === 'datetime' ? 'datetime-local' : field.component"
    :disable="readonly"
    :clearable="!!field.nullable && !readonly"
    :error="!!error"
    :error-message="error"
    stack-label
    outlined
    dense
    no-error-icon
    @update:model-value="emit('update:modelValue', $event)"
  />
  <q-input
    v-else-if="field.component === 'json'"
    class="pachi-admin-field pachi-admin-field--json pachi-admin-field--wide"
    :model-value="modelValue as string | null"
    :label="label"
    :disable="readonly"
    :error="!!(error || jsonError)"
    :error-message="error || jsonError"
    type="textarea"
    input-class="pachi-admin-mono"
    rows="6"
    outlined
    dense
    no-error-icon
    @update:model-value="emit('update:modelValue', $event)"
  />
  <q-input
    v-else-if="field.component === 'textarea'"
    class="pachi-admin-field pachi-admin-field--wide"
    :model-value="modelValue as string | null"
    :label="label"
    :disable="readonly"
    :maxlength="field.maxlength"
    :clearable="!!field.nullable && !readonly"
    :error="!!error"
    :error-message="error"
    type="textarea"
    autogrow
    outlined
    dense
    no-error-icon
    @update:model-value="emit('update:modelValue', $event)"
  />
  <q-input
    v-else
    class="pachi-admin-field"
    :model-value="modelValue as string | null"
    :label="label"
    :disable="readonly"
    :maxlength="field.maxlength"
    :clearable="!!field.nullable && !readonly"
    :error="!!error"
    :error-message="error"
    outlined
    dense
    no-error-icon
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import type { AdminPk, IAdminField, IAdminSchema } from '../types/admin'
import PachiAdminLookup from './PachiAdminLookup.vue'
import { messages } from '../locales'
import { fieldKey } from '../helpers/model-key'
import { findComponent } from '../helpers/options'
import { fieldOptions } from '../helpers/schema-text'

/**
 * Controllo di un campo del form, scelto da `field.component`. Un componente registrato con
 * `setPachiAdminOptions({ components })` (per campo `app.model.campo` o per tipo di controllo) lo sostituisce.
 */
const props = withDefaults(defineProps<{
  schema: IAdminSchema
  /** Nome del campo (camelCase). */
  name: string
  field: IAdminField
  modelValue?: unknown
  /** Etichetta già risolta (traduzione + asterisco se obbligatorio). */
  label: string
  /** Campo di sola lettura (readonly dello schema o permesso `change` mancante). */
  readonly?: boolean
  /** Messaggio d'errore (client o 422). */
  error?: string
}>(), { readonly: false, error: '' })

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()

const { t } = usePachiI18n(messages)

const custom = computed(() => findComponent(fieldKey(props.schema.app, props.schema.model, props.name), props.field.component))
const selectOptions = computed(() => fieldOptions(props.field))

/** Errore di sintassi mostrato mentre si scrive un JSON. */
const jsonError = computed(() => {
  const raw = props.modelValue
  if (typeof raw !== 'string' || raw.trim() === '') return ''
  try {
    JSON.parse(raw)
    return ''
  } catch {
    return t('pachiAdmin.form.invalidJson')
  }
})
</script>
