<template>
  <q-card class="pachi-fuc">
    <!-- Header: filename + date -->
    <div
      class="pachi-fuc__header"
      :class="{ 'pachi-fuc--done': isUploaded || isFailed }"
    >
      <div class="pachi-fuc__filename">
        {{ fileName }}
        <pachi-popup-edit
          v-if="!isUploaded && !isUploading"
          v-model="fileName"
        />
      </div>
      <div class="pachi-fuc__date">{{ lastModifiedToDate(fileItem.lastModified) }}</div>
    </div>

    <!-- Body: thumb + form -->
    <div class="pachi-fuc__body">
      <div
        class="pachi-fuc__thumb"
        :class="{
          'cursor-zoom-in': canPreview,
          'pachi-fuc__thumb--uploading': isUploading,
          'pachi-fuc__thumb--done': isUploaded || isFailed,
        }"
        :role="canPreview ? 'button' : undefined"
        :tabindex="canPreview ? 0 : undefined"
        :aria-label="canPreview ? fileItem.name : undefined"
        @click="openPreview"
        @keydown.enter.prevent="openPreview"
        @keydown.space.prevent="openPreview"
      >
        <q-circular-progress
          v-if="isUploading"
          class="pachi-fuc__overlay"
          size="90px"
          :thickness="0.15"
          :indeterminate="progressPercent === 0"
          :aria-label="t('pachiUploader.status.uploading')"
          :value="progressPercent"
          :color="storageStatus?.status === 'error' ? 'negative' : 'primary'"
          :track-color="$q.dark.isActive ? 'grey-9' : 'grey-3'"
          :show-value="progressPercent > 0"
          font-size="18px"
        >
          {{ progressPercent }}%
        </q-circular-progress>
        <q-icon
          v-if="isUploaded"
          :name="mdiThumbUp"
          size="2rem"
          color="positive"
          class="pachi-fuc__overlay"
        />
        <q-icon
          v-if="isFailed"
          :name="mdiThumbDown"
          size="2rem"
          color="negative"
          class="pachi-fuc__overlay"
        />
        <img
          v-if="fileItem.__img"
          :src="fileItem.__img.src"
          :alt="fileItem.name"
          class="pachi-fuc__thumb-media"
        />
        <iframe
          v-else-if="pdfBlobUrl"
          :src="`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`"
          scrolling="no"
          class="pachi-fuc__pdf-iframe pachi-fuc__thumb-media"
          tabindex="-1"
        ></iframe>
        <div
          v-else-if="thumbText !== null"
          class="pachi-fuc__text-thumb pachi-fuc__thumb-media"
        >
          <pre class="pachi-fuc__text-pre">{{ thumbText }}</pre>
        </div>
        <q-icon
          v-else
          :name="icon"
          size="2rem"
          class="pachi-fuc__thumb-media"
        />
      </div>

      <!-- inert: durante/dopo l'upload il form non e' modificabile ne' da mouse ne' da tastiera (l'anteprima resta attiva) -->
      <div
        class="pachi-fuc__form"
        :class="{ 'no-pointer-events': isUploaded || isUploading }"
        :inert="isUploaded || isUploading || undefined"
      >
        <slot></slot>
        <slot
          name="card-extension"
          :fileItem="fileItem"
          :item="localFileItem"
        ></slot>
      </div>
    </div>

    <!-- 4px progress bar -->
    <q-linear-progress
      v-if="isUploading"
      :value="progressPercent / 100"
      :indeterminate="progressPercent === 0"
      :aria-label="t('pachiUploader.status.uploading')"
      color="accent"
      style="height: 4px"
    />

    <!-- Footer: mime · size | status | actions -->
    <div class="pachi-fuc__footer">
      <span class="pachi-fuc__mime">{{ fileItem.type }} · {{ fileItem.__sizeLabel }}</span>
      <span
        v-if="storageStatus?.status === 'error'"
        class="pachi-fuc__status text-negative"
      >{{ t('pachiUploader.storageError') }}</span>
      <span
        v-else
        class="pachi-fuc__status"
      >{{ fileStatus }}</span>
      <div class="pachi-fuc__actions">
        <q-btn
          v-if="hasChanges"
          size="10px"
          flat
          dense
          round
          :icon="mdiRestore"
          :aria-label="t('pachiUploader.restore')"
          @click="resetItem"
        >
          <q-tooltip>{{ t('pachiUploader.restore') }}</q-tooltip>
        </q-btn>
        <q-btn
          size="10px"
          flat
          dense
          round
          :icon="mdiDelete"
          color="negative"
          :aria-label="t('pachiUploader.removeFromList')"
          @click="() => emit('removeFile', fileItem)"
        >
          <q-tooltip>{{ t('pachiUploader.removeFromList') }}</q-tooltip>
        </q-btn>
      </div>
    </div>
  </q-card>

  <!-- Full preview dialog -->
  <q-dialog
    v-model="previewOpen"
    transition-show="scale"
    transition-hide="scale"
  >
    <img
      v-if="fileItem.__img"
      :src="fileItem.__img.src"
      :alt="fileItem.name"
      class="pachi-fuc__zoom-img"
      @click="previewOpen = false"
    />
    <div
      v-else-if="pdfBlobUrl"
      class="pachi-fuc__pdf-preview-wrapper"
      @click.stop
    >
      <iframe
        :src="pdfBlobUrl"
        class="pachi-fuc__pdf-preview"
        :title="fileItem.name"
      ></iframe>
    </div>
    <q-card
      v-else-if="fullText !== null"
      class="pachi-fuc__text-preview-card"
      @click.stop
    >
      <pre class="pachi-fuc__text-preview-pre">{{ fullText }}</pre>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts" generic="T">
import { mdiDelete, mdiRestore, mdiThumbDown, mdiThumbUp } from '@quasar/extras/mdi-v7'
import type { EmitFn } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'
import PachiPopupEdit from '../../ui/PachiPopupEdit.vue'
import type { UpdatableFileItem, IPachiUploadCardProps } from '../types/pachi-uploader'
import { usePachiUploadCard } from '../composables/use-pachi-upload-card'

const { t } = usePachiI18n(messages)
const { fileItem, pachiUploaderProps } = defineProps<IPachiUploadCardProps<T>>()
const emit = defineEmits<{
  'update:item': [{ key: string, value: UpdatableFileItem<T> }]
  'removeFile': [fileItem: UpdatableFileItem<T>]
}>()

const {
  fileName, icon, canPreview, pdfBlobUrl, thumbText, fullText, hasChanges, resetItem, openPreview, previewOpen,
  isUploading, isUploaded, isFailed, localFileItem, lastModifiedToDate, fileStatus, storageStatus, progressPercent
} = usePachiUploadCard<T>({ fileItem, pachiUploaderProps }, emit as EmitFn)
</script>

<style lang="scss">
// ── Card ──────────────────────────────────────────────────────────────────────
.pachi-fuc {
  border-radius: var(--pachi-card-r);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 200px;

  // ── Header ────────────────────────────────────────────────────────────────
  .pachi-fuc__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px 6px;
    border-bottom: 1px solid var(--pachi-border);
    background: var(--pachi-surface);
    min-height: 0;
  }

  .pachi-fuc__filename {
    flex: 1;
    min-width: 0;
    font-family: var(--pachi-font);
    font-size: 12px;
    font-weight: 500;
    color: var(--pachi-ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }

  .pachi-fuc__date {
    font-family: var(--pachi-mono);
    font-size: 10px;
    color: var(--pachi-muted);
    flex-shrink: 0;
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  .pachi-fuc__body {
    display: flex;
    gap: 10px;
    padding: 10px;
    flex: 1;
  }

  .pachi-fuc__thumb {
    position: relative;
    width: 80px;
    height: 80px;
    flex-shrink: 0;
    border-radius: 6px;
    overflow: hidden;
    background: var(--pachi-surface-2);
    display: flex;
    align-items: center;
    justify-content: center;

    &--uploading .pachi-fuc__thumb-media {
      filter: blur(2px) brightness(70%);
      opacity: 0.6;
    }

    &--done .pachi-fuc__thumb-media {
      opacity: 0.3;
    }
  }

  .pachi-fuc__thumb-media {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .pachi-fuc__overlay {
    position: absolute !important;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
  }

  .pachi-fuc__form {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  .pachi-fuc__footer {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 6px;
    border-top: 1px solid var(--pachi-border);
    background: var(--pachi-surface);
    min-height: 0;
  }

  .pachi-fuc__mime {
    font-family: var(--pachi-mono);
    font-size: 10px;
    color: var(--pachi-muted);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pachi-fuc__status {
    font-family: var(--pachi-font);
    font-size: 10px;
    color: var(--pachi-ink-2);
    flex-shrink: 0;
  }

  .pachi-fuc__actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }
}

// ── PDF thumb (scaled from 816px virtual width → 80px) ────────────────────────
.pachi-fuc__pdf-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 816px;
  height: 1056px;
  border: none;
  pointer-events: none;
  transform: scale(0.098);
  transform-origin: top left;
}

// ── Text thumb (scaled from 400px virtual → 80px) ─────────────────────────────
.pachi-fuc__text-thumb {
  position: absolute;
  top: 0;
  left: 0;
  width: 400px;
  height: 400px;
  overflow: hidden;
  background: var(--pachi-code-bg, #1e1e1e);
  padding: 8px;
  transform: scale(0.2);
  transform-origin: top left;
  pointer-events: none;
}

.pachi-fuc__text-pre {
  margin: 0;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pachi-code-ink, #d4d4d4);
  white-space: pre-wrap;
  word-break: break-all;
}

// ── Preview dialog ─────────────────────────────────────────────────────────────
.pachi-fuc__zoom-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  cursor: zoom-out;
}

.pachi-fuc__pdf-preview-wrapper {
  width: 80vw;
  height: 90vh;
  overflow: auto;
  border-radius: 8px;
}

.pachi-fuc__pdf-preview {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.pachi-fuc__text-preview-card {
  width: 80vw;
  max-height: 90vh;
  overflow: auto;
}

.pachi-fuc__text-preview-pre {
  margin: 16px;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
  overflow-x: auto;
}
</style>
