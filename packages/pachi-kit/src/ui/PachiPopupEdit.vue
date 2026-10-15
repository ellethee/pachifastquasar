<template>
  <q-popup-edit
    v-model="model"
    :title="title"
    :validate="validate"
    #default="scope"
  >
    <q-input
      :model-value="scope.value"
      dense
      autofocus
      counter
      :rules="rules"
      :type="type ?? 'text'"
      @update:model-value="scope.value = coerceInputValue(type, $event)"
      @keyup.enter="onEnter($event, scope)"
    >
      <template #after>
        <q-btn
          flat
          dense
          color="negative"
          :icon="mdiCloseCircle"
          :aria-label="t('pachiUi.popupEdit.cancel')"
          @click.stop.prevent="scope.cancel"
        />

        <q-btn
          flat
          dense
          color="positive"
          :icon="mdiCheckCircle"
          :aria-label="t('pachiUi.popupEdit.confirm')"
          :disable="scope.validate(scope.value) === false || scope.initialValue === scope.value"
          @click.stop.prevent="scope.set"
        />
      </template>
    </q-input>
  </q-popup-edit>
</template>
<script setup lang="ts">
import { mdiCheckCircle, mdiCloseCircle } from '@quasar/extras/mdi-v7'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from './locales'
import { passesRules } from './helper/rules'
import { coerceInputValue } from './helper/coerce-input'
import type { PachiRule } from './helper/rules'

const { t } = usePachiI18n(messages)
const model = defineModel()
const props = defineProps<{
  type?: 'text' | 'number' | 'password' | 'email' | 'tel' | 'url' | 'search'|'textarea'
  /** Title shown at the top of the popup (`title` of `q-popup-edit`). */
  title?: string
  /** Validation rules (like `rules` of `q-input`): the message is shown in the field and confirmation is disabled until all of them are satisfied. */
  rules?: PachiRule[]
}>()

/**
 * Value validation for `q-popup-edit` (blocks `set`, also with Enter).
 *
 * @param value - current value of the field
 * @returns true if it satisfies all the `rules`
 */
function validate(value: string | number | null | undefined): boolean {
  return passesRules(props.rules, value)
}

/**
 * Enter in the field: confirms the edit; in a `textarea` Enter inserts a new line and Ctrl+Enter confirms.
 *
 * @param event - keyboard event
 * @param scope - `q-popup-edit` scope (with `set`)
 */
function onEnter(event: KeyboardEvent, scope: { set: () => void }): void {
  if (props.type === 'textarea' && !event.ctrlKey && !event.metaKey) return
  scope.set()
}
</script>
