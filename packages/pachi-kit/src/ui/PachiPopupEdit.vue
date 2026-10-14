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
  /** Titolo mostrato in cima al popup (`title` di `q-popup-edit`). */
  title?: string
  /** Regole di validazione (come `rules` di `q-input`): il messaggio e' mostrato nel campo e la conferma e' disabilitata finche' non sono tutte soddisfatte. */
  rules?: PachiRule[]
}>()

/**
 * Validazione del valore per `q-popup-edit` (blocca `set`, anche con Invio).
 *
 * @param value - valore corrente del campo
 * @returns true se rispetta tutte le `rules`
 */
function validate(value: string | number | null | undefined): boolean {
  return passesRules(props.rules, value)
}

/**
 * Invio nel campo: conferma la modifica; in un `textarea` Invio va a capo e si conferma con Ctrl+Invio.
 *
 * @param event - evento tastiera
 * @param scope - scope di `q-popup-edit` (con `set`)
 */
function onEnter(event: KeyboardEvent, scope: { set: () => void }): void {
  if (props.type === 'textarea' && !event.ctrlKey && !event.metaKey) return
  scope.set()
}
</script>
