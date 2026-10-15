import type { RouteComponent, RouteRecordRaw } from 'vue-router'
import { mdiAccountCircleOutline } from '@quasar/extras/mdi-v7'
import type { IAppConfig } from '../../config'

/**
 * Shell authentication routes (login). The page can be replaced with `config.components.loginPage`.
 *
 * @param config - resolved configuration
 * @returns auth routes
 */
export default function authRoutes(config: IAppConfig): RouteRecordRaw[] {
  return [
    {
      path: '/auth/login',
      meta: {
        noAuth: true,
        root: true,
        titleKey: 'app.routes.login.title',
        descriptionKey: 'app.routes.login.description',
        icon: mdiAccountCircleOutline
      },
      component: (config.components?.loginPage ??
        (() => import('./LoginPage.vue'))) as RouteComponent
    }
  ]
}
