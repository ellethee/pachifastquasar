import { mdiFormTextbox } from '@quasar/extras/mdi-v7'

/** Gallery of the form components of `@ilpachi/pachi-kit` (`edit-dialog`, `fields`, `uploader`). */
export default [
  {
    path: '/gallery-forms',
    meta: { title: 'Gallery: forms', icon: mdiFormTextbox, order: 73 },
    component: () => import('./GalleryFormsPage.vue')
  }
]
