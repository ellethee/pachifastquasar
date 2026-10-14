import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

/** English messages of `@ilpachi/pachi-kit/ui`. */
const en: PachiMessages<typeof it> = {
  pachiUi: {
    confirmDialog: {
      meta: 'confirm · destructive action',
      typePrefix: 'Type',
      typeSuffix: 'to confirm:',
      escCancel: 'cancel',
      cancel: 'Cancel',
      submit: 'Delete',
      confirmWord: 'DELETE',
      escKey: 'Esc',
      placeholder: '—',
      inputLabel: 'Type {word} to confirm',
    },
    datePicker: {
      close: 'Close',
      openDate: 'Pick a date',
      openTime: 'Pick a time',
    },
    popupEdit: {
      cancel: 'Cancel edit',
      confirm: 'Confirm edit',
    },
  },
}

export default en
