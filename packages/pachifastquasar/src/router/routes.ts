import type { RouteComponent, RouteRecordRaw } from 'vue-router'
import { getFilteredRoutes, collectFeatureRoutes, ensureNavigableRoutes } from './routes-finder'
import type { PachiGlob } from './routes-finder'
import { pachiLogo } from '../extras/pachi-icons'
import type { IAppConfig, PachiEnv } from '../core/config'
import authRoutes from '../core/auth/pages/routes'

/** Sorgenti delle route fornite dall'app (risultati di `import.meta.glob`). */
export interface PachiRoutesSources {
  /** Route delle feature (`/src/features/**` + `/routes.ts`). */
  features?: PachiGlob | undefined
  /** Route dei package `@ilpachi/*` (`/node_modules/@ilpachi/*` + `/{routes,dist/routes,src/routes}.{ts,js}`). */
  packages?: PachiGlob | undefined
  /** Variabili d'ambiente per `ilpachi-<pkg>-disable-route`. */
  env?: PachiEnv | undefined
}

/**
 * Costruisce l'albero finale delle route: route core `meta.root` (prima), auth (se abilitata), route di
 * package e feature ordinate per `meta.order`, e catch-all finale. Le route con `meta.root === true`
 * diventano top-level (fuori dal layout), le altre figlie del layout.
 *
 * @param config - configurazione risolta (componenti sostituibili, titolo, logo, auth)
 * @param sources - glob di package e feature
 * @returns route per `createRouter`
 */
export function buildPachiRoutes(
  config: IAppConfig,
  sources: PachiRoutesSources = {}
): RouteRecordRaw[] {
  const collected = ensureNavigableRoutes(collectFeatureRoutes(sources))
  const rootRoutes = getFilteredRoutes(collected.filter(r => r.meta?.root === true))
  const childRoutes = getFilteredRoutes(collected.filter(r => r.meta?.root !== true))
  const auth = config.auth.enabled ? authRoutes(config) : []
  const layout = (config.components?.layout ??
    (() => import('../core/layouts/MainLayout.vue'))) as RouteComponent
  const errorPage = (config.components?.errorPage ??
    (() => import('../core/pages/ErrorNotFound.vue'))) as RouteComponent

  return [
    {
      path: '/',
      component: layout,
      meta: {
        // title: config.app.title,
        icon: typeof config.logo === 'string' ? config.logo : pachiLogo,
        description: config.app.description,
        hideTitle: true
      },
      children: [...auth.filter(r => r.meta?.root !== true), ...childRoutes]
    },
    ...auth.filter(r => r.meta?.root === true),
    ...rootRoutes,
    { path: '/:catchAll(.*)*', component: errorPage }
  ]
}
