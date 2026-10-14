import type { RouteRecordRaw } from 'vue-router'
import type { PachiEnv } from '../core/config'

/** Risultato di `import.meta.glob(..., { eager: true, import: 'default' })`: `{ percorso: modulo|default }`. */
export type PachiGlob = Record<string, unknown>

const PACKAGE_NAME_REGEX = /\/node_modules\/@ilpachi\/([^/]+)\//

/**
 * Ordina le route per `meta.order` (default 99), in modo stabile e senza mutare l'input.
 *
 * @param routes - route da ordinare
 * @returns nuovo array ordinato
 */
export function getFilteredRoutes(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return [...routes].sort(
    (i1, i2) =>
      (i1?.meta?.order !== undefined ? i1.meta.order : 99) -
      (i2?.meta?.order !== undefined ? i2.meta.order : 99)
  )
}

/**
 * Nome del package `@ilpachi/<nome>` da un percorso di glob (`/node_modules/@ilpachi/<nome>/...`).
 *
 * @param path - percorso restituito dal glob
 * @returns il nome (senza scope) oppure `undefined`
 */
export function extractPackageName(path: string): string | undefined {
  return PACKAGE_NAME_REGEX.exec(path)?.[1]
}

/** Vero per `true`, `'true'`, `'1'`, `'yes'`, `'on'` (case-insensitive). */
export function isTruthyEnv(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return false
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase())
}

/**
 * Vero se le route (e le voci di menu) del package sono disabilitate dalla variabile d'ambiente
 * `ilpachi-<package>-disable-route`.
 *
 * @param packageName - nome senza scope (es. `fastquasar-settings`)
 * @param env - variabili d'ambiente (tipicamente `import.meta.env`)
 */
export function isPackageRouteDisabled(packageName: string, env: PachiEnv): boolean {
  return isTruthyEnv(env[`ilpachi-${packageName}-disable-route`])
}

/** Modulo ES con `default` (o il valore stesso, se il glob usa `import: 'default'`). */
export function unwrapDefault(mod: unknown): unknown {
  return mod && typeof mod === 'object' && 'default' in mod
    ? (mod as { default: unknown }).default
    : mod
}

/**
 * Filtra le voci di un glob dei package `@ilpachi/*` scartando quelli disabilitati da env.
 *
 * @param glob - risultato del glob (chiavi = percorsi in `node_modules/@ilpachi/<nome>/...`)
 * @param env - variabili d'ambiente
 * @returns coppie `[nomePackage, valore]` dei package abilitati, una per package (preferendo `dist/`)
 */
export function enabledPackageEntries(glob: PachiGlob, env: PachiEnv): [string, unknown][] {
  // un package linkato ha sia `src/` sia `dist/`: il glob li trova entrambi, se ne tiene uno solo
  // (preferenza: dist, poi root, poi src) per non duplicare rotte e voci di menu
  const rank = (path: string) => (path.includes('/dist/') ? 0 : path.includes('/src/') ? 2 : 1)
  const chosen = new Map<string, { rank: number; mod: unknown }>()
  for (const [path, mod] of Object.entries(glob)) {
    const packageName = extractPackageName(path)
    if (!packageName) continue
    if (isPackageRouteDisabled(packageName, env)) {
      if (env.DEV) console.info(`[routes] rotte di @ilpachi/${packageName} disabilitate da env`)
      continue
    }
    const current = chosen.get(packageName)
    if (!current || rank(path) < current.rank) chosen.set(packageName, { rank: rank(path), mod })
  }
  return [...chosen].map(([name, { mod }]) => [name, unwrapDefault(mod)])
}

/**
 * Route esportate dai package `@ilpachi/*` (default export di `routes`: una route o un array).
 *
 * @param glob - risultato del glob dei `routes` dei package
 * @param env - variabili d'ambiente (per `ilpachi-<pkg>-disable-route`)
 */
export function collectPackageRoutes(glob: PachiGlob, env: PachiEnv = {}): RouteRecordRaw[] {
  return enabledPackageEntries(glob, env).flatMap(([, routes]) => routes as RouteRecordRaw[])
}

/**
 * Route delle feature dell'app (default export di `src/features/** /routes.ts`).
 *
 * @param glob - risultato del glob delle feature
 */
export function collectAppFeatureRoutes(glob: PachiGlob): RouteRecordRaw[] {
  return Object.values(glob).flatMap(mod => unwrapDefault(mod) as RouteRecordRaw[])
}

/**
 * Route dei package seguite da quelle delle feature (ordine storico del boilerplate).
 *
 * @param sources - glob di package e feature, ed env
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
