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

/** Modalità della history del router. */
export type PachiRouterMode = 'hash' | 'history' | 'memory'

/** Opzioni di {@link createPachiRouter}. */
export interface CreatePachiRouterOptions {
  /** Configurazione della shell; se omessa si usa quella già impostata (`setPachiConfig`). */
  config?: PachiConfigInput
  /** `import.meta.glob('/src/features/**' + '/routes.ts', { eager: true, import: 'default' })` dell'app. */
  features?: PachiGlob
  /**
   * `import.meta.glob('/node_modules/@ilpachi/*' + '/{routes,dist/routes,src/routes}.{ts,js}', { eager: true, import: 'default' })`:
   * route esportate dai package `@ilpachi/*`.
   */
  packages?: PachiGlob
  /**
   * `import.meta.glob('/node_modules/@ilpachi/*' + '/{menu,dist/menu,src/menu}.{ts,js}', { eager: true, import: 'default' })`:
   * voci del menu account esportate dai package (contratto `PachiMenuItemFactory`).
   */
  menus?: PachiGlob
  /** Variabili d'ambiente (`import.meta.env`) per `ilpachi-<pkg>-disable-route`. */
  env?: PachiEnv
  /** History del router (default `hash`). In Quasar: `import.meta.env.QUASAR_VUE_ROUTER_MODE`. */
  mode?: PachiRouterMode | string | undefined
  /** Base della history (default nessuna). In Quasar: `import.meta.env.QUASAR_VUE_ROUTER_BASE`. */
  base?: string | undefined
}

/**
 * Crea la history del router in base alla modalità.
 *
 * @param mode - `history`, `memory` o (default) `hash`
 * @param base - base URL
 */
export function createPachiHistory(mode: string | undefined, base?: string): RouterHistory {
  if (mode === 'history') return createWebHistory(base)
  if (mode === 'memory' || mode === 'abstract') return createMemoryHistory(base)
  return createWebHashHistory(base)
}

/**
 * Crea il router della shell: route core + auth + route di feature e package (passate dall'app come
 * risultati di `import.meta.glob`), history configurabile e guardia di navigazione (restore silenzioso
 * della sessione, redirect al login, autorizzazione per route con `meta.permissions/requireStaff/...`).
 * L'app lo avvolge nel proprio `defineRouter` di Quasar.
 *
 * @param options - vedi {@link CreatePachiRouterOptions}
 * @returns il router di vue-router
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

    // Tenta restore silenzioso e connette il WS se non ancora connesso
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
      // la landing stessa non accessibile: rimandarvi sarebbe un redirect infinito (la pagina filtra i contenuti per permessi)
      return to.path === landing ? true : landing
    }
  })

  return router
}
