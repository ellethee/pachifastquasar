import { mdiFileDocumentOutline, mdiFileExcelOutline, mdiFileOutline, mdiFilePdfBox, mdiFilePowerpointOutline, mdiImage } from '@quasar/extras/mdi-v7'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import type { EmitFn, Ref } from 'vue'
import { Notify } from 'quasar'
import { computed, onUnmounted, ref, watch } from 'vue'
import { messages } from '../locales'
import type { IPachiUploadCardProps, IStorageFileStatus } from '../types/pachi-uploader'
import { MAX_TEXT_PREVIEW_BYTES, isTextFile, mapProgress } from '../helpers/uploader-utils'

function lastModifiedToDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function usePachiUploadCard<T>({ fileItem, pachiUploaderProps }: IPachiUploadCardProps<T>, emit?: EmitFn) {
const { locale, t } = usePachiI18n(messages)
const _emit: EmitFn = emit ?? (() => { })
const { keyMapping={file:'filename',date:'date',size:'size'} } = pachiUploaderProps
const originalFileItem = ref<T>({
  ...pachiUploaderProps.itemDefaults,
  [keyMapping.file ?? 'filename']: fileItem.name,
  [keyMapping.date ?? 'date']: new Date(fileItem.lastModified).toISOString(),
  [keyMapping.size ?? 'size']: fileItem.size,
} as T)
const localFileItem = ref<T>({ ...originalFileItem.value })
pachiUploaderProps.events.updateMetadata({ key: fileItem.__key, value: { ...localFileItem.value } })
const fileName = computed({
  get: () => localFileItem.value[keyMapping.file ?? 'filename'] ?? fileItem.name,
  set: (val) =>{
      localFileItem.value[keyMapping.file ?? 'filename'] = val
      // _emit('update:item', { key: fileItem.__key, value: { ...localFileItem.value } })
  }
})
watch(localFileItem, (newVal) => {
      _emit('update:item', { key: fileItem.__key, value: { ...newVal } })
}, { deep: true })
const isUploading = computed(() => pachiUploaderProps.getFileStatus(fileItem.__key) === 'uploading')
const isUploaded = computed(() => pachiUploaderProps.getFileStatus(fileItem.__key) === 'uploaded')
const isFailed = computed(() => pachiUploaderProps.getFileStatus(fileItem.__key) === 'failed')
/** Stato del file tradotto (`pachiUploader.status.*`). */
const fileStatus = computed(() => {
  const status = pachiUploaderProps.getFileStatus(fileItem.__key)
  const key = `pachiUploader.status.${status}`
  const label = t(key)
  return label === key ? status : label
})
const storageStatus = computed<IStorageFileStatus | undefined>(() => pachiUploaderProps.storageStatuses[fileItem.__key])
/** Percentuale complessiva: browser 0-50% + storage 50-100% con event bus, altrimenti browser 0-100%. */
const progressPercent = computed(() => mapProgress(fileItem.__progress, storageStatus.value))
function resetItem() {
  localFileItem.value = { ...originalFileItem.value }
}
const hasChanges = computed(() => {
  return JSON.stringify(localFileItem.value) !== JSON.stringify({ ...originalFileItem.value })
})

// PDF: blob URL creato una volta, riusato per thumbnail e preview
const pdfBlobUrl = fileItem.type === 'application/pdf'
  ? URL.createObjectURL(fileItem)
  : null

onUnmounted(() => {
  if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
})

// Text: legge i primi 400 byte per il thumbnail
const thumbText = ref<string | null>(null)
if (isTextFile(fileItem)) {
  fileItem.slice(0, 400).text().then((t: string) => { thumbText.value = t }).catch(() => { thumbText.value = null })
}

// Contenuto completo: letto lazily all'apertura della preview, troncato oltre MAX_TEXT_PREVIEW_BYTES
const fullText = ref<string | null>(null)

const previewOpen = ref(false)

const canPreview = computed(
  () => !!fileItem.__img || !!pdfBlobUrl || thumbText.value !== null,
)

async function openPreview() {
  if (!canPreview.value) return
  try {
    if (thumbText.value !== null && fullText.value === null) {
      fullText.value = fileItem.size > MAX_TEXT_PREVIEW_BYTES
        ? `${await fileItem.slice(0, MAX_TEXT_PREVIEW_BYTES).text()}\n…`
        : await fileItem.text()
    }
    previewOpen.value = true
  } catch {
    // file non piu' leggibile (rimosso/modificato su disco): l'anteprima resta chiusa
    Notify.create({ type: 'negative', message: t('pachiUploader.previewError') })
  }
}


const icon = computed<string>(() => {
  if (fileItem.type === 'application/pdf') return mdiFilePdfBox
  if (fileItem.type === 'application/msword' || fileItem.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return mdiFileDocumentOutline
  if (fileItem.type === 'application/vnd.ms-excel' || fileItem.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return mdiFileExcelOutline
  if (fileItem.type === 'application/vnd.ms-powerpoint' || fileItem.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return mdiFilePowerpointOutline
  if (fileItem.type.startsWith('image/')) return mdiImage
  return mdiFileOutline
})
return {
  localFileItem: localFileItem as Ref<T>,
  fileName,
  isUploading,
  isUploaded,
  isFailed,
  resetItem,
  hasChanges,
  canPreview,
  openPreview,
  previewOpen,
  thumbText,
  fullText,
  pdfBlobUrl,
  lastModifiedToDate: (ts: number) => lastModifiedToDate(ts, locale.value),
  fileStatus,
  storageStatus,
  progressPercent,
  icon
}
}
