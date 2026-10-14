import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { shellArg, USE_SHELL } from './process.js'

const execFileAsync = promisify(execFile)

/** Scope of the boilerplate packages. */
export const PACKAGE_SCOPE = '@ilpachi/'

/** Timeout (ms) of the registry availability check. */
export const REGISTRY_CHECK_TIMEOUT_MS = 5000

/** `@ilpachi/*` dependency declared by the project with its range. */
export interface ScopedDependency {
  name: string
  range: string
}

/**
 * Lists the `@ilpachi/*` dependencies (dependencies, devDependencies, optionalDependencies) of a package.json.
 *
 * @param pkg - project package.json
 */
export function readScopedDependencies(pkg: Record<string, unknown>): ScopedDependency[] {
  const result = new Map<string, string>()
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const map = pkg[field] as Record<string, string> | undefined
    for (const [name, range] of Object.entries(map ?? {})) {
      if (name.startsWith(PACKAGE_SCOPE)) result.set(name, range)
    }
  }
  return [...result].map(([name, range]) => ({ name, range })).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Checks, read-only (`npm view <name>@<range> version`), whether the registry has a version
 * compatible with the requested range. Any error, timeout or lack of network counts as
 * "not available".
 *
 * @param name - full package name
 * @param range - requested semver range (e.g. `^0.1.0`); if absent only the name is checked
 * @param registry - registry URL to query; if absent the user's npm configuration is used
 */
export async function isPublishedOnRegistry(name: string, range?: string, registry?: string): Promise<boolean> {
  try {
    const spec = range ? `${name}@${range}` : name
    const args = ['view', shellArg(spec), 'version', ...(registry ? [`--registry=${shellArg(registry)}`] : [])]
    const { stdout } = await execFileAsync('npm', args, { timeout: REGISTRY_CHECK_TIMEOUT_MS, shell: USE_SHELL })
    return stdout.trim().length > 0
  } catch {
    return false
  }
}
