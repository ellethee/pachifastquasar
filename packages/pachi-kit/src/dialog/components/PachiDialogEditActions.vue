<template>
  <transition-group name="pachi-actions" tag="div" class="pachi-dialog-actions">
    <q-btn
      v-if="hasChanges"
      key="restore"
      :round="!showLabels"
      :icon="mdiRestore"
      flat
      no-caps
      color="primary"
      :aria-label="showLabels ? undefined : t('pachiDialog.restore')"
      :label="showLabels ? t('pachiDialog.restore') : undefined"
      @click="$emit('restore')"
    >
      <q-tooltip v-if="!showLabels">{{ t('pachiDialog.restore') }}</q-tooltip>
    </q-btn>
    <q-btn
      v-if="hasChanges"
      key="save"
      :round="!showLabels"
      :icon="mdiContentSave"
      flat
      no-caps
      color="positive"
      :aria-label="showLabels ? undefined : t('pachiDialog.save')"
      :label="showLabels ? t('pachiDialog.save') : undefined"
      @click="$emit('save')"
    >
      <q-tooltip v-if="!showLabels">{{ t('pachiDialog.save') }}</q-tooltip>
    </q-btn>
    <q-btn
      key="cancel"
      :round="!showLabels"
      :icon="mdiClose"
      flat
      no-caps
      :aria-label="showLabels ? undefined : t('pachiDialog.close')"
      :label="showLabels ? t('pachiDialog.close') : undefined"
      @click="$emit('cancel')"
    >
      <q-tooltip v-if="!showLabels">{{ t('pachiDialog.close') }}</q-tooltip>
    </q-btn>
  </transition-group>
</template>
<script setup lang="ts">
import { mdiClose, mdiContentSave, mdiRestore } from '@quasar/extras/mdi-v7'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'
const { t } = usePachiI18n(messages)
defineProps<{ hasChanges: boolean, showLabels?: boolean }>()
defineEmits ([ 'restore', 'save', 'cancel' ] as const)
</script>
