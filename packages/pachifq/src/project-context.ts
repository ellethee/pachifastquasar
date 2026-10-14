import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { PackageJsonLike } from './package-manager.js'

export class NotAPachiProjectError extends Error {}

export interface ProjectContext {
  cwd: string
  featuresDir: string
  pkg: PackageJsonLike
}

/**
 * Dependencies that identify a Pachi app: the `@ilpachi/pachifastquasar` shell and, for apps derived from the
 * old boilerplate (source copy), the HTTP packages (`use-alova`, or the legacy `httpachi`) and i18n.
 */
const PACHI_MARKER_DEPS = ['@ilpachi/pachifastquasar', '@ilpachi/use-alova', '@ilpachi/httpachi', '@ilpachi/pachi-i18n']

/**
 * Checks that cwd is a Pachi app. Any one of these signs is enough: the `@ilpachi/pachifastquasar` dependency
 * (current model), the `src/features` folder, the `@ilpachi/use-alova`, `@ilpachi/httpachi` (legacy) or
 * `@ilpachi/pachi-i18n` dependency, or `src/router/use-routes-finder.ts` (apps derived from the old
 * boilerplate). The `quasar` dependency alone is NOT enough (any Quasar app has it).
 */
export function assertPachiProject(cwd: string): ProjectContext {
  const pkgPath = path.join(cwd, 'package.json')
  if (!existsSync(pkgPath)) {
    throw new NotAPachiProjectError(
      `No package.json found in "${cwd}". Run "pachifq" from the root of an app based on @ilpachi/pachifastquasar.`,
    )
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJsonLike
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  const hasMarkerDep = PACHI_MARKER_DEPS.some((name) => name in deps)
  const hasRoutesFinder = existsSync(path.join(cwd, 'src', 'router', 'use-routes-finder.ts'))
  const hasFeaturesDir = existsSync(path.join(cwd, 'src', 'features'))

  if (!hasRoutesFinder && !hasFeaturesDir && !hasMarkerDep) {
    throw new NotAPachiProjectError(
      `"${cwd}" does not look like an app based on @ilpachi/pachifastquasar ` +
        `(missing src/features and the ${PACHI_MARKER_DEPS.join(' / ')} dependencies).\n` +
        `Run "pachifq" from the app root (create one with "pachifq create").`,
    )
  }

  return { cwd, featuresDir: path.join(cwd, 'src', 'features'), pkg }
}

export interface FeatureInfo {
  name: string
  hasRoutes: boolean
  title?: string
}

/**
 * Lists the features in src/features/*. The "title" is extracted with a light
 * regex on the contents of routes.ts (not a real TS parser): enough for a
 * diagnostic listing, it takes the first match in the file.
 */
export function listFeatures(featuresDir: string): FeatureInfo[] {
  if (!existsSync(featuresDir)) return []

  return readdirSync(featuresDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const routesPath = path.join(featuresDir, entry.name, 'routes.ts')
      const hasRoutes = existsSync(routesPath)
      let title: string | undefined
      if (hasRoutes) {
        const content = readFileSync(routesPath, 'utf-8')
        title = content.match(/title:\s*['"]([^'"]+)['"]/)?.[1]
      }
      return { name: entry.name, hasRoutes, ...(title !== undefined && { title }) }
    })
}
