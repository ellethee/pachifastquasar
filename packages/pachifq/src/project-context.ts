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
 * Dipendenze che identificano un'app Pachi: la shell `@ilpachi/pachifastquasar` e, per le app derivate dal
 * vecchio boilerplate (copia dei sorgenti), i package HTTP (`use-alova`, o il legacy `httpachi`) e i18n.
 */
const PACHI_MARKER_DEPS = ['@ilpachi/pachifastquasar', '@ilpachi/use-alova', '@ilpachi/httpachi', '@ilpachi/pachi-i18n']

/**
 * Verifica che cwd sia un'app Pachi. Basta uno di questi segni: la dipendenza `@ilpachi/pachifastquasar`
 * (modello attuale), la cartella `src/features`, la dipendenza `@ilpachi/use-alova`, `@ilpachi/httpachi` (legacy) o `@ilpachi/pachi-i18n`, oppure
 * `src/router/use-routes-finder.ts` (app derivate dal vecchio boilerplate). La sola dipendenza `quasar` NON
 * basta (qualunque app Quasar la ha).
 */
export function assertPachiProject(cwd: string): ProjectContext {
  const pkgPath = path.join(cwd, 'package.json')
  if (!existsSync(pkgPath)) {
    throw new NotAPachiProjectError(
      `Nessun package.json trovato in "${cwd}". Esegui "pachifq" dalla root di un'app basata su @ilpachi/pachifastquasar.`,
    )
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJsonLike
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  const hasMarkerDep = PACHI_MARKER_DEPS.some((name) => name in deps)
  const hasRoutesFinder = existsSync(path.join(cwd, 'src', 'router', 'use-routes-finder.ts'))
  const hasFeaturesDir = existsSync(path.join(cwd, 'src', 'features'))

  if (!hasRoutesFinder && !hasFeaturesDir && !hasMarkerDep) {
    throw new NotAPachiProjectError(
      `"${cwd}" non sembra un'app basata su @ilpachi/pachifastquasar ` +
        `(mancano src/features e le dipendenze ${PACHI_MARKER_DEPS.join(' / ')}).\n` +
        `Esegui "pachifq" dalla root dell'app (si crea con "pachifq create").`,
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
 * Elenca le feature in src/features/*. Il "title" è estratto con una regex
 * leggera sul contenuto di routes.ts (non un vero parser TS): sufficiente
 * per un elenco diagnostico, prende il primo match nel file.
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
