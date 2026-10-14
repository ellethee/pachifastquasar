import type { QUploader, QUploaderProps } from 'quasar'
import type { Ref } from 'vue'
import type  PachiUploader  from '../components/PachiUploader.vue'

export interface IPachiUploaderFile extends File {
  /** Chiave univoca: webkitRelativePath + lastModified + name + size */
  __key: string
  /** Stato corrente del file nell'uploader */
  __status: 'idle' | 'uploading' | 'uploaded' | 'failed'
  /** Byte già caricati */
  __uploaded: number
  /** Progresso normalizzato da 0 a 1 */
  __progress: number
  /** Etichetta progresso, es. "45.32%" */
  __progressLabel: string
  /** Etichetta dimensione leggibile, es. "1.5 MB" */
  __sizeLabel: string
  /** Solo per immagini: HTMLImageElement con src = ObjectURL del file */
  __img?: HTMLImageElement
  /** Nome originale del file, impostato quando il nome inviato al server e' stato rinominato dall'utente */
  __originalName?: string
  /** Annulla l'upload in corso; impostata dal plugin XHR durante l'upload */
  __abort?: () => void
}
export interface IPachiUploaderUpdatableFile extends IPachiUploaderFile {
  id: number
  title: string|undefined
  description: string|undefined
  active: boolean
}
export interface IPachiUploaderThumbnailableFile extends IPachiUploaderUpdatableFile {
  thumbnail: string
  thumbnailMimeType: string
}

export type UpdatableFileItem<T> = T & IPachiUploaderUpdatableFile

export interface IUsePachiUploaderProps<T = unknown> {
  /** Props da passare al componente QUploader interno */
  uploaderProps: Partial<QUploaderProps>
  itemDefaults: T
  filenameKey?: string
  keyMapping?: Record<string, string>
  label?: string|undefined
  headerTarget?: HTMLElement | undefined
  /**
   * Se fornito, abilita il tracking del progresso server→storage.
   * Genera un `upload_id`, lo aggiunge come campo form e registra un handler
   * sull'event bus passato dal consumer.
   */
  eventBus?: {
    addHandler: (event: string, handler: { onMessage: (data: unknown) => void }) => void
    removeHandler: (event: string, handler: { onMessage: (data: unknown) => void }) => void
  }
  /** Nome dell'evento dell'event bus con il progresso server→storage. Default 'upload_progress'. */
  progressEvent?: string
  extraParams?: Record<string, unknown>
  /**
   * Header aggiuntivi delle richieste di upload: array statico oppure funzione valutata a ogni richiesta
   * (utile per token che cambiano, es. `() => [{ name: 'Authorization', value: `Bearer ${token()}` }]`).
   * Non ha effetto se `uploaderProps.headers` e' gia' definito.
   */
  headers?: { name: string, value: string }[] | (() => { name: string, value: string }[])
  /** Mostra nell'header i toggle "batch" e "dry run" (default false: sono solo flag esposti in `useBatch`/`dryRun`, senza logica interna). */
  showBatchToggles?: boolean
}

export type PachiUploaderCardEmits<T> = {
   'update:item': [{ key: string, value: UpdatableFileItem<T> }],
   'removeFile': [fileItem: UpdatableFileItem<T>]
}
export interface IPachiUploadCardProps<T = unknown>  {
  fileItem: UpdatableFileItem<T>
  pachiUploaderProps: IPachiUploaderProps<T>
}

export interface IPachiUploaderPropsEvents {
  removeFile: (fileItem: unknown) => void
  added: (files: readonly File[]) => void
  updateMetadata: (payload: { key: string, value: unknown }) => void
}

export interface IStorageFileStatus {
  progress: number
  status: 'uploading' | 'done' | 'error'| 'idle'
  error?: string
}

export interface IPachiUploaderProps<T = unknown> extends IUsePachiUploaderProps<T>  {
  qUploaderRef: Ref<InstanceType<typeof QUploader> | null>
  getUploaderRef: (el: InstanceType<typeof QUploader> | null) => void
  useBatch: Ref<boolean>
  dryRun: Ref<boolean>
  getFileStatus: (key: string) => string
  setFileStatus: (key: string, status: string) => void
  getFileMetadata: (key: string) => T
  itemsMetadata:  Record<string, T>
  fileStatuses: Record<string, string>
  /** Progresso upload server→storage per file, keyed by __key. Popolato solo se e' stato passato `eventBus`. */
  storageStatuses: Record<string, IStorageFileStatus>
  events: IPachiUploaderPropsEvents
  filenameKey: string

}

export interface IUsePachiUploaderReturn<T = unknown> {
  PachiUploader: typeof PachiUploader,
  pachiUploaderProps: IPachiUploaderProps<T>
}

/** Scope dello slot `header` del `QUploader` usato dall'header di `PachiUploader`. */
export interface IUploaderHeaderScope {
  canAddFiles: boolean
  canUpload: boolean
  isUploading: boolean
  queuedFiles: unknown[]
  uploadedFiles: unknown[]
  uploadSizeLabel: string
  uploadProgressLabel: string
  pickFiles: () => void
  upload: () => void
  abort: () => void
  removeQueuedFiles: () => void
  removeUploadedFiles: () => void
}
