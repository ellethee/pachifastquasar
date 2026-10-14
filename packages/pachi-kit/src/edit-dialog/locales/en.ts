import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

/** English messages of `@ilpachi/pachi-kit/edit-dialog`. */
const en: PachiMessages<typeof it> = {
  pachiEditDialog: {
    close: 'Close',
    restore: 'Restore original values',
    save: 'Save changes',
    savedNow: 'saved just now',
    savedAgo: 'saved · {seconds}s ago',
    saved: 'saved',
    validationErrors: 'There are errors to fix in the entered data.',
    saveError: 'Error while saving: {error}',
    discardTitle: 'Confirm discard',
    discardMessage: 'There are unsaved changes. Are you sure you want to close?',
    sections: {
      schedulerTitle: 'Scheduling',
      permissionsTitle: 'Permissions',
    },
    scheduler: {
      enable: 'Enable scheduling',
      days: {
        mon: 'Mon',
        tue: 'Tue',
        wed: 'Wed',
        thu: 'Thu',
        fri: 'Fri',
        sat: 'Sat',
        sun: 'Sun',
      },
    },
    permissions: {
      roles: 'Roles (comma separated)',
      users: 'Users (comma separated)',
      publishMode: 'Shared publish mode: {mode}',
    },
  },
}

export default en
