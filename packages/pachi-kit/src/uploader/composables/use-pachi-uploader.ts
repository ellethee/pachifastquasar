import type { IUsePachiUploaderProps, IUsePachiUploaderReturn, IStorageFileStatus, UpdatableFileItem } from '../types/pachi-uploader'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'
import { ADD_FILES_LABEL_KEY as ADD_FILES_KEY } from '../helpers/uploader-defaults'
import PachiUploader from '../components/PachiUploader.vue'
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import type { QUploader, QUploaderFormFieldsItem } from 'quasar'
import { applyUploadNames, buildMetadataMap, cloneUploaderProps, generateUid, pickKeyForFilename, resolveHeaders, stringifyParam } from '../helpers/uploader-utils'

/**
 * Creates the uploader's shared state and returns the `PachiUploader` component with the props to pass to it.
 * `uploaderProps` is not mutated: the callback/headers wrappers are applied to a copy.
 * The options (`url`, static `headers`, `method`...) are read ONCE at creation: later changes
 * to the passed object do not reach the `QUploader` (for dynamic headers use a function in `headers`).
 *
 * @param options - options (see `IUsePachiUploaderProps`)
 * @returns component and `pachiUploaderProps`
 */
export function usePachiUploader<T>({ itemDefaults, uploaderProps: uploaderPropsInput, showBatchToggles = false, filenameKey='filename', headerTarget = undefined, eventBus = undefined, extraParams= {}, headers = [], keyMapping= {file:'filename',date:'date',size:'size'}, progressEvent = 'upload_progress' }: IUsePachiUploaderProps<T>): IUsePachiUploaderReturn<T> {
  const { t } = usePachiI18n(messages)
  const uploaderProps = cloneUploaderProps(uploaderPropsInput)
  if (uploaderProps.label === ADD_FILES_KEY) uploaderProps.label = t(ADD_FILES_KEY)
  const itemsMetadata = reactive<Record<string, T>>({})
  const fileStatuses = reactive<Record<string, string>>({})
  const storageStatuses = reactive<Record<string, IStorageFileStatus>>({})
  const qUploaderRef = ref<QUploader | null>(null)
  const useBatch = ref(false)
  const dryRun = ref(false)

  // Mapping filename → __key (several files may have the same name) to route WS messages to the correct file
  const filenameToKeys: Record<string, string[]> = {}
  // Name under which each file is registered in filenameToKeys (changes when the user renames the file)
  const keyToName: Record<string, string> = {}

  function registerName(key: string, name: string): void {
    const prev = keyToName[key]
    if (prev !== undefined && prev !== name) unregisterName(key)
    const keys = filenameToKeys[name] ?? (filenameToKeys[name] = [])
    if (!keys.includes(key)) keys.push(key)
    keyToName[key] = name
  }

  function unregisterName(key: string): void {
    const name = keyToName[key]
    if (name === undefined) return
    const keys = filenameToKeys[name]?.filter(k => k !== key)
    if (keys && keys.length > 0) filenameToKeys[name] = keys
    else delete filenameToKeys[name]
    delete keyToName[key]
  }

  // UUID fixed for the whole life of the composable, used to filter broadcast events
  const sessionId = eventBus ? generateUid() : null

  const uploadProgressHandler = {
    onMessage: (rawData: unknown) => {
      const data = rawData as {
        upload_id: string
        filename: string
        progress: number
        status: IStorageFileStatus['status']
        error?: string
      }
      if (!data || data.upload_id !== sessionId) return
      const key = pickKeyForFilename(filenameToKeys[data.filename], (k) => {
        const st = storageStatuses[k]?.status
        return st === 'done' || st === 'error'
      })
      if (!key) return
      storageStatuses[key] = {
        progress: data.progress ?? 0,
        status: data.status ?? 'uploading',
        ...(data.error ? { error: data.error } : {}),
      }
    },
  }

  onMounted(() => {
    if (sessionId) eventBus?.addHandler(progressEvent, uploadProgressHandler)
  })
  onUnmounted(() => {
    if (sessionId) eventBus?.removeHandler(progressEvent, uploadProgressHandler)
  })

  /** Removes all the state associated with a file (idempotent). */
  function cleanupFile(f: { __key: string }): void {
    delete fileStatuses[f.__key]
    delete itemsMetadata[f.__key]
    delete storageStatuses[f.__key]
    unregisterName(f.__key)
  }

  function removeFile(fileItem: unknown): void {
    const f = fileItem as UpdatableFileItem<T>
    cleanupFile(f)
    qUploaderRef.value?.removeFile(f)
  }

  /** `removed` event of the QUploader (also from the header buttons "remove all/uploaded"). */
  function removed(files: readonly File[]): void {
    for (const f of files as UpdatableFileItem<T>[]) cleanupFile(f)
  }

  function updateMetadata({ key, value }: { key: string, value: unknown }): void {
    itemsMetadata[key] = value as T
  }

  function added(files: readonly File[]): void {
    for (const file of files as UpdatableFileItem<T>[]) {
      fileStatuses[file.__key] = 'idle'
      itemsMetadata[file.__key] = { ...itemDefaults }
      registerName(file.__key, file.name)
      // the storage state exists only with event bus: without it, the progress is entirely the browser's (0-100%)
      if (eventBus) storageStatuses[file.__key] = { progress: 0, status: 'idle' }
    }
  }

  function getFileStatus(key: string): string {
    return fileStatuses[key] || 'idle'
  }

  function getFileMetadata(key: string): T {
    return itemsMetadata[key] || { ...itemDefaults }
  }

  function setFileStatus(key: string, status: string): void {
    fileStatuses[key] = status
  }

  // `added` is NOT hooked to `onAdded` here: the PachiUploader template already listens to it (`@added`),
  // otherwise it would be called twice. Any user `onAdded` stays in `uploaderProps`.
  const onRemovedOriginal = uploaderProps?.onRemoved
  uploaderProps.onRemoved = (files) => {
    removed(files)
    onRemovedOriginal?.(files)
  }

  const formFields = uploaderProps?.formFields || undefined
  uploaderProps.formFields = (files): QUploaderFormFieldsItem[] => {
    const originalFields = typeof formFields === 'function' ? formFields(files) : formFields || [] as QUploaderFormFieldsItem[]
    // the name renamed in the card becomes the multipart part name (consistent with `metadata` and the progress events)
    const names = applyUploadNames(files as UpdatableFileItem<T>[], itemsMetadata, keyMapping.file ?? 'filename')
    for (const [key, name] of Object.entries(names)) registerName(key, name)
    const localMetadata = buildMetadataMap(files as UpdatableFileItem<T>[], itemsMetadata)
    const metadataField: QUploaderFormFieldsItem = { name: 'metadata', value: JSON.stringify(localMetadata) }

    const extraFields: QUploaderFormFieldsItem[] = []
    for (const [key, value] of Object.entries(extraParams)) {
      const str = stringifyParam(value)
      if (str !== undefined) extraFields.push({ name: key, value: str })
    }
    if (sessionId) {
      extraFields.push({ name: 'upload_id', value: sessionId })
    }

    return [metadataField, ...extraFields, ...originalFields as QUploaderFormFieldsItem[]]
  }

  function upLoading({ files }: { files: readonly UpdatableFileItem<T>[], xhr: XMLHttpRequest }): void {
    for (const file of files) if (file.__key in fileStatuses) fileStatuses[file.__key] = 'uploading'
  }
  function uploaded({ files }: { files: readonly UpdatableFileItem<T>[], xhr: XMLHttpRequest }): void {
    for (const file of files) {
      if (file.__key in fileStatuses) fileStatuses[file.__key] = 'uploaded'
    }
  }
  function failed({ files }: { files: readonly UpdatableFileItem<T>[], xhr: XMLHttpRequest }): void {
    // a file removed during the upload (abort) must not recreate the 'failed' state
    for (const file of files) if (file.__key in fileStatuses) fileStatuses[file.__key] = 'failed'
  }

  const onUploadingOriginal = uploaderProps?.onUploading
  const onUploadedOriginal = uploaderProps?.onUploaded
  const onFailedOriginal = uploaderProps?.onFailed
  uploaderProps.onUploading = (info) => {
    upLoading(info)
    onUploadingOriginal?.(info)
  }
  uploaderProps.onUploaded = (info) => {
    uploaded(info)
    onUploadedOriginal?.(info)
  }
  uploaderProps.onFailed = (info) => {
    failed(info)
    onFailedOriginal?.(info)
  }
  uploaderProps.headers = uploaderProps.headers || resolveHeaders(headers)

  function getUploaderRef(el: QUploader | null) {
    if (el) {
      qUploaderRef.value = el
    }
  }

  return {
    PachiUploader,
    pachiUploaderProps: {
      uploaderProps,
      itemDefaults,
      filenameKey,
      headerTarget,
      showBatchToggles,
      qUploaderRef,
      getUploaderRef,
      useBatch,
      dryRun,
      getFileStatus,
      setFileStatus,
      getFileMetadata,
      fileStatuses: reactive(fileStatuses),
      storageStatuses: reactive(storageStatuses),
      itemsMetadata: reactive(itemsMetadata),
      keyMapping,
      events: {
        removeFile,
        added,
        updateMetadata
      },
    }
  }
}
