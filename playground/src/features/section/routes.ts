import { mdiFolderOutline } from '@quasar/extras/mdi-v7'

/** Padre SENZA `component` con due figli: la shell mostra la dashboard dei figli (e2e: kit.spec.ts). */
export default [
  {
    path: '/section',
    meta: { title: 'Section', description: 'Parent without component', icon: mdiFolderOutline, order: 71 },
    children: [
      {
        path: 'first',
        meta: { title: 'First child' },
        component: () => import('../kit/KitPage.vue')
      },
      {
        path: 'second',
        meta: { title: 'Second child' },
        component: () => import('../kit/KitPage.vue')
      }
    ]
  }
]
