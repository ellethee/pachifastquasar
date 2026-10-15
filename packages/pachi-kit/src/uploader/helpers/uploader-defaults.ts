import type { QUploaderProps } from 'quasar'

/** i18n key of the default label of `QUploader`. */
export const ADD_FILES_LABEL_KEY = 'pachiUploader.addFilesLabel'

/**
 * Default props of `QUploader`. `label` is the i18n KEY (`ADD_FILES_LABEL_KEY`), not the text:
 * `usePachiUploader` translates it after registering the package messages, so reading or copying
 * this object (even at module level, before the first render) does not raise a missing-key warning.
 * If you pass `defaultUploaderProps` directly to a `QUploader` without `usePachiUploader`, set `label` yourself.
 */
export const defaultUploaderProps: QUploaderProps = {
  url: '',
  multiple: true,
  label: ADD_FILES_LABEL_KEY,
  autoUpload: false,
  method: 'POST',
  fieldName: 'file',
}
