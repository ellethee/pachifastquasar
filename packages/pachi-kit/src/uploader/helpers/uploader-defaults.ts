import type { QUploaderProps } from 'quasar'

/** Chiave i18n del label di default del `QUploader`. */
export const ADD_FILES_LABEL_KEY = 'pachiUploader.addFilesLabel'

/**
 * Props di default del `QUploader`. `label` e' la CHIAVE i18n (`ADD_FILES_LABEL_KEY`), non il testo:
 * `usePachiUploader` la traduce dopo aver registrato i messaggi del package, cosi' leggere o copiare
 * questo oggetto (anche a livello di modulo, prima del primo render) non genera warning di chiave mancante.
 * Se passi `defaultUploaderProps` direttamente a un `QUploader` senza `usePachiUploader`, imposta tu `label`.
 */
export const defaultUploaderProps: QUploaderProps = {
  url: '',
  multiple: true,
  label: ADD_FILES_LABEL_KEY,
  autoUpload: false,
  method: 'POST',
  fieldName: 'file',
}
