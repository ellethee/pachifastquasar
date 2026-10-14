import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

/** English messages of `@ilpachi/pachi-kit/table`. */
const en: PachiMessages<typeof it> = {
  pachiTable2: {
    filter: 'Filter...',
    clearSelection: 'Deselect all',
    actions: 'Actions',
    editRow: 'Edit',
    deleteRow: 'Delete',
    sortAsc: 'Ascending order (position {position})',
    sortDesc: 'Descending order (position {position})',
    all: 'All',
    rowsPerPage: 'Rows per page: {rows}/{total}',
    confirmTitle: 'Confirm',
    confirmDelete: 'Are you sure you want to delete this record?',
    multipleFailed: 'Operation succeeded on {ok} of {total} items',
    loadError: 'Loading failed',
    retry: 'Retry',
  },
}

export default en
