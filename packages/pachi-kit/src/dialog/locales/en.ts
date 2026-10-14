import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

/** English messages of `@ilpachi/pachi-kit/dialog`. */
const en: PachiMessages<typeof it> = {
  pachiDialog: {
    confirm: 'Confirm',
    close: 'Close',
    restore: 'Restore original values',
    save: 'Save changes',
    discardTitle: 'Confirm Discard',
    discardMessage: 'There are unsaved changes. Are you sure you want to discard them?',
  },
}

export default en
