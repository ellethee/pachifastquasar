<template>
  <div>
    <!-- Toolbar interna (quando non è dentro PachiDialog) -->
    <q-toolbar v-if="!target" class="q-pt-none pachi-uploader__toolbar">
      <q-toolbar-title> {{ label }} </q-toolbar-title>
      <pachi-uploader-header-actions
        v-model:use-batch="useBatch"
        v-model:dry-run="dryRun"
        :scope="scope"
        :show-toggles="showToggles"
        :on-upload-click="onUploadClick"
        color="primary"
      />
    </q-toolbar>

    <!-- Teleport nella toolbar del dialog (quando è dentro PachiDialog) -->
    <teleport v-else :to="target">
      <pachi-uploader-header-actions
        v-model:use-batch="useBatch"
        v-model:dry-run="dryRun"
        :scope="scope"
        :show-toggles="showToggles"
        :on-upload-click="onUploadClick"
      />
    </teleport>
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import { usePachiDialogToolbar } from '../../dialog/composables/usePachiDialogToolbar'
import type { IUploaderHeaderScope } from '../types/pachi-uploader'
import PachiUploaderHeaderActions from './PachiUploaderHeaderActions.vue'

const useBatch = defineModel('useBatch', { type: Boolean, default: false })
const dryRun = defineModel('dryRun', { type: Boolean, default: false })
const { scope, label = undefined, headerTarget = undefined, showToggles = false, onUploadClick = undefined } = defineProps<{
  label?: string | undefined
  scope: IUploaderHeaderScope
  headerTarget?: HTMLElement | undefined
  /** Mostra i toggle batch / dry run (default false). */
  showToggles?: boolean
  onUploadClick?: (() => void) | undefined
}>()

const { target: dialogTarget } = usePachiDialogToolbar()
const target = computed(() => {
  if (headerTarget) return headerTarget
  const dialog = dialogTarget.value
  return dialog ?? null
})
</script>
<style lang="scss">
.pachi-uploader__toolbar {
  background: transparent !important;
}
</style>
