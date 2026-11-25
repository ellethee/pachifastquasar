import { mdiViewGalleryOutline } from '@quasar/extras/mdi-v7'

/** Gallery of the `@ilpachi/pachi-kit` `ui` and `dialog` components (fake data only). */
export default [
  {
    path: '/gallery-ui',
    meta: { title: 'Gallery: UI', icon: mdiViewGalleryOutline, order: 72, pageScroll: true },
    component: () => import('./GalleryUiPage.vue')
  }
]
