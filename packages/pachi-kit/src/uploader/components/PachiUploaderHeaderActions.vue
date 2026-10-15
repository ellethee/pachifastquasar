<template>
  <transition-group name="pachi-actions" tag="div" class="row no-wrap items-center q-pa-sm q-gutter-xs">
    <q-btn
      v-if="scope.uploadedFiles.length > 0"
      key="remove-uploaded"
      :icon="mdiCheckAll"
      :color="color"
      :aria-label="t('pachiUploader.removeUploaded')"
      round
      flat
      @click="scope.removeUploadedFiles"
    >
      <q-tooltip>{{ t('pachiUploader.removeUploaded') }}</q-tooltip>
    </q-btn>
    <q-spinner
      v-if="scope.isUploading"
      key="spinner"
      class="q-uploader__spinner"
      role="status"
      :aria-label="t('pachiUploader.status.uploading')"
    />
    <div key="size-label" class="col">
      <div class="text-subtitle1" :class="color ? `text-${color}` : undefined">{{ scope.uploadSizeLabel }} / {{ scope.uploadProgressLabel }}</div>
    </div>
    <q-btn
      v-if="scope.canAddFiles"
      key="add-files"
      :icon="mdiPlaylistPlus"
      :color="color"
      :aria-label="t('pachiUploader.addFiles')"
      round
      flat
      @click="scope.pickFiles"
    >
      <q-uploader-add-trigger />
      <q-tooltip>{{ t('pachiUploader.addFiles') }}</q-tooltip>
    </q-btn>
    <q-btn
      v-if="scope.canUpload"
      key="upload"
      :icon="mdiCloudUpload"
      :color="color"
      :aria-label="t('pachiUploader.upload')"
      round
      flat
      @click="onUpload"
    >
      <q-tooltip>{{ t('pachiUploader.upload') }}</q-tooltip>
    </q-btn>
    <q-btn
      v-if="scope.isUploading"
      key="abort"
      :icon="mdiClose"
      color="negative"
      :aria-label="t('pachiUploader.abort')"
      round
      flat
      @click="scope.abort"
    >
      <q-tooltip>{{ t('pachiUploader.abort') }}</q-tooltip>
    </q-btn>
    <q-btn
      v-if="scope.queuedFiles.length > 0"
      key="remove-queued"
      :icon="mdiNotificationClearAll"
      color="negative"
      :aria-label="t('pachiUploader.removeAll')"
      round
      flat
      @click="scope.removeQueuedFiles"
    >
      <q-tooltip>{{ t('pachiUploader.removeAll') }}</q-tooltip>
    </q-btn>
    <template v-if="showToggles">
      <q-toggle
        key="batch"
        v-model="useBatch"
        :icon="mdiPlaylistCheck"
        color="accent"
        :aria-label="t('pachiUploader.useBatch')"
      >
        <q-tooltip>{{ t('pachiUploader.useBatch') }}</q-tooltip>
      </q-toggle>
      <q-toggle
        key="dry-run"
        v-model="dryRun"
        color="negative"
        :icon="mdiTestTube"
        :aria-label="t('pachiUploader.dryRun')"
      >
        <q-tooltip>{{ t('pachiUploader.dryRun') }}</q-tooltip>
      </q-toggle>
    </template>
  </transition-group>
</template>
<script lang="ts" setup>
import { mdiCheckAll, mdiClose, mdiCloudUpload, mdiNotificationClearAll, mdiPlaylistCheck, mdiPlaylistPlus, mdiTestTube } from '@quasar/extras/mdi-v7'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'
import type { IUploaderHeaderScope } from '../types/pachi-uploader'

const { t } = usePachiI18n(messages)
const useBatch = defineModel('useBatch', { type: Boolean, default: false })
const dryRun = defineModel('dryRun', { type: Boolean, default: false })
const { scope, color = undefined, showToggles = false, onUploadClick = undefined } = defineProps<{
  scope: IUploaderHeaderScope
  /** Button color (internal toolbar); absent when the actions are teleported into the dialog. */
  color?: string | undefined
  /** Shows the batch / dry run toggles. */
  showToggles?: boolean
  onUploadClick?: (() => void) | undefined
}>()

function onUpload() {
  if (onUploadClick) onUploadClick()
  else scope.upload()
}
</script>
