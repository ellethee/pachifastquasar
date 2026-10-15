import { RouterView } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { PachiEnv } from '../core/config'

/** Result of `import.meta.glob(..., { eager: true, import: 'default' })`: `{ path: module|default }`. */
export type PachiGlob = Record<string, unknown>

const PACKAGE_NAME_REGEX = /\/node_modules\/@ilpachi\/([^/]+)\//

/**
 * Sorts routes by `meta.order` (default 99), stably and without mutating the input.
 *
 * @param routes - routes to sort
 * @returns new sorted array
 */
export function getFilteredRoutes(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return [...routes].sort(
    (i1, i2) =>
      (i1?.meta?.order !== undefined ? i1.meta.order : 99) -
      (i2?.meta?.order !== undefined ? i2.meta.order : 99)
  )
}

/**
 * Makes routes with children but without `component`, `components` or `redirect` navigable: vue-router does not
 * register such a parent (the parent URL would fall into the 404 catch-all), whereas here they must open the
 * automatic dashboard of the children. Recursive, does not mutate the input.
 *
 * @param routes - feature and package routes
 * @returns routes with a `RouterView` as component where it was missing
 */
export function ensureNavigableRoutes(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return routes.map(route => {
    const children = route.children
    if (!children?.length) return route
    const record = route as RouteRecordRaw & { component?: unknown; components?: unknown }
    const needsComponent = !record.component && !record.components && !route.redirect
    return {
      ...route,
      ...(needsComponent ? { component: RouterView } : {}),
      children: ensureNavigableRoutes(children)
    } as RouteRecordRaw
  })
}

/**
 * Name of the `@ilpachi/<name>` package from a glob path (`/node_modules/@ilpachi/<name>/...`).
 *
 * @param path - path returned by the glob
 * @returns the name (without scope) or `undefined`
 */
export function extractPackageName(path: string): string | undefined {
  return PACKAGE_NAME_REGEX.exec(path)?.[1]
}

/** True for `true`, `'true'`, `'1'`, `'yes'`, `'on'` (case-insensitive). */
export function isTruthyEnv(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return false
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase())
}

/**
 * True if the package routes (and menu items) are disabled by the environment variable
 * `ilpachi-<package>-disable-route`.
 *
 * @param packageName - name without scope (e.g. `fastquasar-settings`)
 * @param env - environment variables (typically `import.meta.env`)
 */
export function isPackageRouteDisabled(packageName: string, env: PachiEnv): boolean {
  return isTruthyEnv(env[`ilpachi-${packageName}-disable-route`])
}

/** ES module with `default` (or the value itself, if the glob uses `import: 'default'`). */
export function unwrapDefault(mod: unknown): unknown {
  return mod && typeof mod === 'object' && 'default' in mod
    ? (mod as { default: unknown }).default
    : mod
}

/**
 * Filters the entries of a glob of the `@ilpachi/*` packages, discarding those disabled by env.
 *
 * @param glob - glob result (keys = paths in `node_modules/@ilpachi/<name>/...`)
 * @param env - environment variables
 * @returns `[packageName, value]` pairs of the enabled packages, one per package (preferring `dist/`)
 */
export function enabledPackageEntries(glob: PachiGlob, env: PachiEnv): [string, unknown][] {
  // a linked package has both `src/` and `dist/`: the glob finds both, only one is kept
  // (preference: dist, then root, then src) to avoid duplicating routes and menu items
  const rank = (path: string) => (path.includes('/dist/') ? 0 : path.includes('/src/') ? 2 : 1)
  const chosen = new Map<string, { rank: number; mod: unknown }>()
  for (const [path, mod] of Object.entries(glob)) {
    const packageName = extractPackageName(path)
    if (!packageName) continue
    if (isPackageRouteDisabled(packageName, env)) {
      if (env.DEV) console.info(`[routes] routes of @ilpachi/${packageName} disabled by env`)
      continue
    }
    const current = chosen.get(packageName)
    if (!current || rank(path) < current.rank) chosen.set(packageName, { rank: rank(path), mod })
  }
  return [...chosen].map(([name, { mod }]) => [name, unwrapDefault(mod)])
}

/**
 * Routes exported by the `@ilpachi/*` packages (default export of `routes`: a route or an array).
 *
 * @param glob - result of the packages `routes` glob
 * @param env - environment variables (for `ilpachi-<pkg>-disable-route`)
 */
export function collectPackageRoutes(glob: PachiGlob, env: PachiEnv = {}): RouteRecordRaw[] {
  return enabledPackageEntries(glob, env).flatMap(([, routes]) => routes as RouteRecordRaw[])
}

/**
 * App feature routes (default export of `src/features/** /routes.ts`).
 *
 * @param glob - result of the features glob
 */
export function collectAppFeatureRoutes(glob: PachiGlob): RouteRecordRaw[] {
  return Object.values(glob).flatMap(mod => unwrapDefault(mod) as RouteRecordRaw[])
}

/**
 * Package routes followed by feature ones (historical order of the boilerplate).
 *
 * @param sources - package and feature globs, and env
 */
export function collectFeatureRoutes(sources: {
  packages?: PachiGlob | undefined
  features?: PachiGlob | undefined
  env?: PachiEnv | undefined
}): RouteRecordRaw[] {
  return [
    ...collectPackageRoutes(sources.packages ?? {}, sources.env ?? {}),
    ...collectAppFeatureRoutes(sources.features ?? {})
  ]
}
