import type { QUploader, QUploaderProps } from 'quasar'
import type { Ref } from 'vue'
import type  PachiUploader  from '../components/PachiUploader.vue'

export interface IPachiUploaderFile extends File {
  /** Unique key: webkitRelativePath + lastModified + name + size */
  __key: string
  /** Current status of the file in the uploader */
  __status: 'idle' | 'uploading' | 'uploaded' | 'failed'
  /** Bytes already uploaded */
  __uploaded: number
  /** Progress normalized from 0 to 1 */
  __progress: number
  /** Progress label, e.g. "45.32%" */
  __progressLabel: string
  /** Human-readable size label, e.g. "1.5 MB" */
  __sizeLabel: string
  /** Images only: HTMLImageElement with src = the file's ObjectURL */
  __img?: HTMLImageElement
  /** Original file name, set when the name sent to the server has been renamed by the user */
  __originalName?: string
  /** Cancels the upload in progress; set by the XHR plugin during the upload */
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
  /** Props to pass to the internal QUploader component */
  uploaderProps: Partial<QUploaderProps>
  itemDefaults: T
  filenameKey?: string
  keyMapping?: Record<string, string>
  label?: string|undefined
  headerTarget?: HTMLElement | undefined
  /**
   * If provided, enables server→storage progress tracking.
   * Generates an `upload_id`, adds it as a form field and registers a handler
   * on the event bus passed by the consumer.
   */
  eventBus?: {
    addHandler: (event: string, handler: { onMessage: (data: unknown) => void }) => void
    removeHandler: (event: string, handler: { onMessage: (data: unknown) => void }) => void
  }
  /** Name of the event bus event carrying the server→storage progress. Default 'upload_progress'. */
  progressEvent?: string
  extraParams?: Record<string, unknown>
  /**
   * Additional headers of the upload requests: static array or function evaluated on every request
   * (useful for changing tokens, e.g. `() => [{ name: 'Authorization', value: `Bearer ${token()}` }]`).
   * Has no effect if `uploaderProps.headers` is already defined.
   */
  headers?: { name: string, value: string }[] | (() => { name: string, value: string }[])
  /** Shows the "batch" and "dry run" toggles in the header (default false: they are only flags exposed in `useBatch`/`dryRun`, with no internal logic). */
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
  /** Server→storage upload progress per file, keyed by __key. Populated only if `eventBus` was passed. */
  storageStatuses: Record<string, IStorageFileStatus>
  events: IPachiUploaderPropsEvents
  filenameKey: string

}

export interface IUsePachiUploaderReturn<T = unknown> {
  PachiUploader: typeof PachiUploader,
  pachiUploaderProps: IPachiUploaderProps<T>
}

/** Scope of the `header` slot of `QUploader` used by the `PachiUploader` header. */
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
