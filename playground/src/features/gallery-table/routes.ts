import { mdiTableLarge } from '@quasar/extras/mdi-v7'

/** Live gallery of `PachiTable2` (`@ilpachi/pachi-kit/table`) served by an in-browser fake API. */
export default [
  {
    path: '/gallery/table',
    meta: { title: 'Gallery: table', icon: mdiTableLarge, order: 74,pageScroll: true },
    component: () => import('./GalleryTablePage.vue')
  }
]
