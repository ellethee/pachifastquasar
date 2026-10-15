import type { RouteComponent, RouteRecordRaw } from 'vue-router'
import { getFilteredRoutes, collectFeatureRoutes, ensureNavigableRoutes } from './routes-finder'
import type { PachiGlob } from './routes-finder'
import { pachiLogo } from '../extras/pachi-icons'
import type { IAppConfig, PachiEnv } from '../core/config'
import authRoutes from '../core/auth/pages/routes'

/** Route sources provided by the app (`import.meta.glob` results). */
export interface PachiRoutesSources {
  /** Feature routes (`/src/features/**` + `/routes.ts`). */
  features?: PachiGlob | undefined
  /** Routes of the `@ilpachi/*` packages (`/node_modules/@ilpachi/*` + `/{routes,dist/routes,src/routes}.{ts,js}`). */
  packages?: PachiGlob | undefined
  /** Environment variables for `ilpachi-<pkg>-disable-route`. */
  env?: PachiEnv | undefined
}

/**
 * Builds the final route tree: core routes `meta.root` (first), auth (if enabled), package and feature
 * routes sorted by `meta.order`, and the final catch-all. Routes with `meta.root === true`
 * become top-level (outside the layout), the others children of the layout.
 *
 * @param config - resolved configuration (replaceable components, title, logo, auth)
 * @param sources - package and feature globs
 * @returns routes for `createRouter`
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
