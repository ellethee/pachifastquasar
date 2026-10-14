import type { IUsePachiUploaderProps, IUsePachiUploaderReturn, IStorageFileStatus, UpdatableFileItem } from '../types/pachi-uploader'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'
import { ADD_FILES_LABEL_KEY as ADD_FILES_KEY } from '../helpers/uploader-defaults'
import PachiUploader from '../components/PachiUploader.vue'
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import type { QUploader, QUploaderFormFieldsItem } from 'quasar'
import { applyUploadNames, buildMetadataMap, cloneUploaderProps, generateUid, pickKeyForFilename, resolveHeaders, stringifyParam } from '../helpers/uploader-utils'

/**
 * Crea lo stato condiviso dell'uploader e restituisce il componente `PachiUploader` con le props da passargli.
 * `uploaderProps` non viene mutato: i wrapper di callback/headers sono applicati a una copia.
 * Le opzioni (`url`, `headers` statici, `method`...) sono lette UNA volta alla creazione: modifiche successive
 * all'oggetto passato non raggiungono il `QUploader` (per header dinamici usa una funzione in `headers`).
 *
 * @param options - opzioni (vedi `IUsePachiUploaderProps`)
 * @returns componente e `pachiUploaderProps`
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

  // Mapping filename → __key (piu' file possono avere lo stesso nome) per instradare i messaggi WS al file corretto
  const filenameToKeys: Record<string, string[]> = {}
  // Nome con cui ogni file e' registrato in filenameToKeys (cambia quando l'utente rinomina il file)
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

  // UUID fisso per tutta la vita del composable, usato per filtrare gli eventi broadcast
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

  /** Rimuove tutto lo stato associato a un file (idempotente). */
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

  /** Evento `removed` del QUploader (anche dai pulsanti header "rimuovi tutti/caricati"). */
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
      // lo stato dello storage esiste solo con event bus: senza, il progresso e' tutto del browser (0-100%)
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

  // `added` NON e' agganciato a `onAdded` qui: lo ascolta gia' il template di PachiUploader (`@added`),
  // altrimenti verrebbe chiamato due volte. Un eventuale `onAdded` dell'utente resta in `uploaderProps`.
  const onRemovedOriginal = uploaderProps?.onRemoved
  uploaderProps.onRemoved = (files) => {
    removed(files)
    onRemovedOriginal?.(files)
  }

  const formFields = uploaderProps?.formFields || undefined
  uploaderProps.formFields = (files): QUploaderFormFieldsItem[] => {
    const originalFields = typeof formFields === 'function' ? formFields(files) : formFields || [] as QUploaderFormFieldsItem[]
    // il nome rinominato nella card diventa il nome della parte multipart (coerente con `metadata` e con gli eventi di progresso)
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
    // un file rimosso durante l'upload (abort) non deve ricreare lo stato 'failed'
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
