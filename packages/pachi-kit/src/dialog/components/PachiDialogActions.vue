<template>
  <transition-group name="pachi-actions" tag="div" class="pachi-dialog-actions">
    <q-btn
      key="confirm"
      :round="!showLabels"
      :icon="mdiCheck"
      flat
      no-caps
      :disabled="confirmDisabled"
      color="positive"
      :aria-label="showLabels ? undefined : t('pachiDialog.confirm')"
      :label="showLabels ? t('pachiDialog.confirm') : undefined"
      @click="$emit('action:ok')"
    >
      <q-tooltip v-if="!showLabels">{{ t('pachiDialog.confirm') }}</q-tooltip>
    </q-btn>
    <q-btn
      key="cancel"
      :round="!showLabels"
      :icon="mdiClose"
      flat
      no-caps
      :disabled="cancelDisabled"
      :aria-label="showLabels ? undefined : t('pachiDialog.close')"
      :label="showLabels ? t('pachiDialog.close') : undefined"
      @click="$emit('action:cancel')"
    >
      <q-tooltip v-if="!showLabels">{{ t('pachiDialog.close') }}</q-tooltip>
    </q-btn>
  </transition-group>
</template>
<script setup lang="ts">
import { mdiCheck, mdiClose } from '@quasar/extras/mdi-v7'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'
const { t } = usePachiI18n(messages)
const { confirmDisabled = false, cancelDisabled = false, showLabels = false } = defineProps<{
  confirmDisabled?: boolean
  cancelDisabled?: boolean
  showLabels?: boolean
}>()
defineEmits ([ 'action:ok', 'action:cancel' ] as const)
</script>
