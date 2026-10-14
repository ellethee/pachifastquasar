import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

/** English messages of `@ilpachi/pachi-kit/uploader`. */
const en: PachiMessages<typeof it> = {
  pachiUploader: {
    addFilesLabel: 'Add files to upload',
    removeUploaded: 'Remove uploaded files',
    addFiles: 'Add files',
    upload: 'Upload files',
    abort: 'Abort upload',
    removeAll: 'Remove all',
    useBatch: 'Use batch upload',
    dryRun: 'Dry run mode',
    storageError: 'Storage error',
    restore: 'Restore',
    removeFromList: 'Remove file from the list',
    previewError: 'Unable to read the file for the preview',
    status: {
      idle: 'Waiting',
      uploading: 'Uploading',
      uploaded: 'Uploaded',
      failed: 'Failed',
    },
  },
}

export default en
