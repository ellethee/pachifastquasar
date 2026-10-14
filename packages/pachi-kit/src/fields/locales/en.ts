import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

/** English messages of `@ilpachi/pachi-kit/fields`. */
const en: PachiMessages<typeof it> = {
  pachiEditDialogFields: {
    loadError: 'Unable to load the options of "{label}"',
    invalidFields: 'Invalid or required fields: {labels}',
    required: 'Required field',
  },
}

export default en
