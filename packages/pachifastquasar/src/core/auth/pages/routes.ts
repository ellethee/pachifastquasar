import type { RouteComponent, RouteRecordRaw } from 'vue-router'
import { mdiAccountCircleOutline } from '@quasar/extras/mdi-v7'
import type { IAppConfig } from '../../config'

/**
 * Route di autenticazione della shell (login). La pagina è sostituibile con `config.components.loginPage`.
 *
 * @param config - configurazione risolta
 * @returns route di auth
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
