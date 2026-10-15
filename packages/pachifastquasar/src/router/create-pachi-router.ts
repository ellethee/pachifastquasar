import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory
} from 'vue-router'
import type { Router, RouterHistory } from 'vue-router'
import { getPachiConfig, setPachiConfig } from '../core/config'
import type { PachiConfigInput, PachiEnv } from '../core/config'
import { AuthManager } from '../services/auth-manager'
import { registerPachiMenus } from '../core/menu/menu-registry'
import { collectPackageMenus } from '../core/menu/collect-menus'
import { buildPachiRoutes } from './routes'
import type { PachiGlob } from './routes-finder'

/** History mode of the router. */
export type PachiRouterMode = 'hash' | 'history' | 'memory'

/** Options of {@link createPachiRouter}. */
export interface CreatePachiRouterOptions {
  /** Shell configuration; if omitted the one already set (`setPachiConfig`) is used. */
  config?: PachiConfigInput
  /** `import.meta.glob('/src/features/**' + '/routes.ts', { eager: true, import: 'default' })` of the app. */
  features?: PachiGlob
  /**
   * `import.meta.glob('/node_modules/@ilpachi/*' + '/{routes,dist/routes,src/routes}.{ts,js}', { eager: true, import: 'default' })`:
   * routes exported by the `@ilpachi/*` packages.
   */
  packages?: PachiGlob
  /**
   * `import.meta.glob('/node_modules/@ilpachi/*' + '/{menu,dist/menu,src/menu}.{ts,js}', { eager: true, import: 'default' })`:
   * account menu items exported by the packages (`PachiMenuItemFactory` contract).
   */
  menus?: PachiGlob
  /** Environment variables (`import.meta.env`) for `ilpachi-<pkg>-disable-route`. */
  env?: PachiEnv
  /** Router history (default `hash`). In Quasar: `import.meta.env.QUASAR_VUE_ROUTER_MODE`. */
  mode?: PachiRouterMode | string | undefined
  /** History base (default none). In Quasar: `import.meta.env.QUASAR_VUE_ROUTER_BASE`. */
  base?: string | undefined
}

/**
 * Creates the router history according to the mode.
 *
 * @param mode - `history`, `memory` or (default) `hash`
 * @param base - base URL
 */
export function createPachiHistory(mode: string | undefined, base?: string): RouterHistory {
  if (mode === 'history') return createWebHistory(base)
  if (mode === 'memory' || mode === 'abstract') return createMemoryHistory(base)
  return createWebHashHistory(base)
}

/**
 * Creates the shell router: core routes + auth + feature and package routes (passed by the app as
 * `import.meta.glob` results), configurable history and navigation guard (silent session restore,
 * redirect to login, authorization per route with `meta.permissions/requireStaff/...`).
 * The app wraps it in its own Quasar `defineRouter`.
 *
 * @param options - see {@link CreatePachiRouterOptions}
 * @returns the vue-router router
 */
export function createPachiRouter(options: CreatePachiRouterOptions = {}): Router {
  const config = options.config ? setPachiConfig(options.config) : getPachiConfig()
  const env = options.env ?? {}
  if (options.menus) registerPachiMenus(collectPackageMenus(options.menus, env))

  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes: buildPachiRoutes(config, {
      features: options.features,
      packages: options.packages,
      env
    }),
    history: createPachiHistory(options.mode, options.base)
  })

  if (config.auth.enabled) AuthManager.setRouter(router)

  router.beforeEach(async (to, _from) => {
    if (!config.auth.enabled) return true
    const authManager = AuthManager.getInstance()
    let isAuthenticated = authManager.isAuthenticated

    // Attempts a silent restore and connects the WS if not already connected
    if (!to.meta.noAuth) {
      isAuthenticated = await authManager.tryRestoreSession()
    }

    if (to.meta.noAuth) {
      if (isAuthenticated) return authManager.getDefaultLandingPath()
      return true
    }

    if (!isAuthenticated) return { path: '/auth/login', query: { next: to.fullPath } }

    if (!authManager.canAccess(to.meta)) {
      const landing = authManager.getDefaultLandingPath()
      // the landing itself is not accessible: redirecting there would be an infinite redirect (the page filters contents by permissions)
      return to.path === landing ? true : landing
    }
  })

  return router
}
