import { mdiFolderOutline } from '@quasar/extras/mdi-v7'

/** Parent WITHOUT `component` with two children: the shell shows the children's dashboard (e2e: kit.spec.ts). */
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
