import { mdiPuzzleOutline } from '@quasar/extras/mdi-v7'

/** Example page of `@ilpachi/pachi-kit` (`ui` and `dialog` sub-paths). */
export default [
  {
    path: '/kit',
    meta: { title: 'Pachi Kit', icon: mdiPuzzleOutline, order: 70 },
    component: () => import('./KitPage.vue')
  }
]
