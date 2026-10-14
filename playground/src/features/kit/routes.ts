import { mdiPuzzleOutline } from '@quasar/extras/mdi-v7'

/** Pagina d'esempio di `@ilpachi/pachi-kit` (sotto-percorsi `ui` e `dialog`). */
export default [
  {
    path: '/kit',
    meta: { title: 'Pachi Kit', icon: mdiPuzzleOutline, order: 70 },
    component: () => import('./KitPage.vue')
  }
]
