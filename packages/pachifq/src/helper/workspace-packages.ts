import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { shellArg, USE_SHELL } from './process.js'

const execFileAsync = promisify(execFile)

/** Scope dei package del boilerplate. */
export const PACKAGE_SCOPE = '@ilpachi/'

/** Timeout (ms) della verifica di disponibilità su registry. */
export const REGISTRY_CHECK_TIMEOUT_MS = 5000

/** Dipendenza `@ilpachi/*` dichiarata dal progetto con il suo range. */
export interface ScopedDependency {
  name: string
  range: string
}

/**
 * Elenca le dipendenze `@ilpachi/*` (dependencies, devDependencies, optionalDependencies) di un package.json.
 *
 * @param pkg - package.json del progetto
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
 * Verifica in sola lettura (`npm view <nome>@<range> version`) se sul registry esiste una versione
 * compatibile con il range richiesto. Qualunque errore, timeout o assenza di rete equivale a
 * "non disponibile".
 *
 * @param name - nome completo del package
 * @param range - range semver richiesto (es. `^0.1.0`); se assente si verifica solo il nome
 * @param registry - URL del registry da interrogare; se assente si usa la configurazione npm dell'utente
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
