<template>
  <q-uploader
    :ref="(el) => getUploaderRef(el as InstanceType<typeof QUploader> | null)"
    v-bind="uploaderProps"
    class="pachi-uploader no-shadow"
    @added="added"
  >
    <template #header="scope">
      <pachi-uploader-header
        v-model:useBatch="useBatch"
        v-model:dryRun="dryRun"
        :label="label"
        :scope="scope"
        :headerTarget="headerTarget"
        :show-toggles="showBatchToggles"
      />
    </template>
    <template #list="scope">
      <div class="pachi-uploader-list">
        <pachi-uploader-card
          v-for="file in scope.files"
          :key="(file as IPachiUploaderFile).__key"
          :fileItem="file"
          :pachi-uploader-props="pachiUploaderProps"
          @removeFile="removeFile"
          @update:item="updateMetadata"
        >
          <template #card-extension="slotProps">
            <slot name="card-extension" v-bind="slotProps">
            </slot>
          </template>
        </pachi-uploader-card>
      </div>
    </template>
  </q-uploader>
</template>
<script lang="ts" setup generic="T">
import { computed } from 'vue'
import { QUploader } from 'quasar'
import PachiUploaderCard from './PachiUploaderCard.vue'
import PachiUploaderHeader from './PachiUploaderHeader.vue'
import type { IPachiUploaderFile, IPachiUploaderProps } from '../types/pachi-uploader'


const {pachiUploaderProps} = defineProps<{pachiUploaderProps: IPachiUploaderProps<T>}>()
const { uploaderProps, label=undefined, useBatch, dryRun, headerTarget, showBatchToggles = false, getUploaderRef, qUploaderRef, events: { removeFile, added, updateMetadata }, getFileStatus, getFileMetadata } = pachiUploaderProps
const canUpload = computed(() => qUploaderRef.value?.canUpload ?? false)
defineExpose({
  getUploaderRef,
  qUploaderRef,
  useBatch,
  dryRun,
  getFileStatus,
  getFileMetadata,
  removeFile,
  added,
  updateMetadata,
  canUpload,
})
</script>
<style lang="scss">
// Customizable height and columns: --pachi-uploader-height (default at zero specificity,
// see theme-defaults.scss: calc(100vh - 100px)) and --pachi-uploader-columns (default auto-fill).
// No !important on the height: just redefine the variable (e.g. 400px, 100%).
.pachi-uploader.q-uploader {
  // 2-class selector: beats max-height/max-width of .q-uploader without !important on the height
  width: 100% !important;
  max-height: var(--pachi-uploader-height);
  min-height: var(--pachi-uploader-height);
  height: var(--pachi-uploader-height);

  .q-uploader__header {
    background-color: transparent;
  }
}

.pachi-uploader-list {
  display: grid;
  grid-template-columns: repeat(var(--pachi-uploader-columns, auto-fill), minmax(200px, 1fr));
  gap: 12px;
  padding: 12px;
  align-items: start;
}
</style>
