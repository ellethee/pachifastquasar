import { mdiViewGalleryOutline } from '@quasar/extras/mdi-v7'

/** Gallery of the reusable UI components of the shell `@ilpachi/pachifastquasar` (fake data only). */
export default [
  {
    path: '/gallery-shell',
    meta: { title: 'Gallery: shell', icon: mdiViewGalleryOutline, order: 75 },
    component: () => import('./GalleryShellPage.vue')
  }
]
