import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * `@ilpachi/*` packages declared by the app (dependencies and devDependencies).
 *
 * In development Vite pre-bundles dependencies (optimizeDeps) but serves as raw files those loaded by
 * `import.meta.glob` (package routes and menus): module state (e.g. `setPachiProfileUser`) would end up in
 * two different copies. Excluding them from pre-optimization serves them all as raw files, a single copy.
 *
 * @param appDir - app folder (contains `package.json`)
 * @returns the names of the `@ilpachi/*` packages (empty if there is no `package.json`)
 */
export function readIlpachiDependencies(appDir: string): string[] {
  const file = path.join(appDir, 'package.json')
  if (!existsSync(file)) return []
  try {
    const json = JSON.parse(readFileSync(file, 'utf-8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    return Object.keys({ ...json.devDependencies, ...json.dependencies }).filter(name =>
      name.startsWith('@ilpachi/')
    )
  } catch {
    return []
  }
}

/** `alova` entries used by the `@ilpachi/*` packages (which stay excluded from the prebundle: the scanner does not see them). */
export const ALOVA_PREBUNDLE_ENTRIES = ['alova', 'alova/client', 'alova/fetch', 'alova/vue']

/**
 * Entries to prebundle together in development. The `@ilpachi/*` packages are excluded from `optimizeDeps`, so
 * Vite does not discover their `alova/client` imports: the app would end up with two copies of alova (one prebundled, one
 * raw) and `usePagination` would fail with "`statesHook` is not set in alova instance".
 *
 * @param appDir - app folder (with its `package.json`)
 * @returns the alova entries if the app depends on `alova`, otherwise `[]`
 */
export function readPrebundleDependencies(appDir: string): string[] {
  const file = path.join(appDir, 'package.json')
  if (!existsSync(file)) return []
  try {
    const json = JSON.parse(readFileSync(file, 'utf-8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const names = { ...json.devDependencies, ...json.dependencies }
    return 'alova' in names ? ALOVA_PREBUNDLE_ENTRIES : []
  } catch {
    return []
  }
}
