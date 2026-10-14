import { existsSync } from 'node:fs'
import { join } from 'node:path'

export type PackageManager = 'pnpm' | 'yarn' | 'npm'

export interface PackageJsonLike {
  packageManager?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/**
 * Rileva il package manager del progetto: prima dal campo "packageManager",
 * poi dal lockfile presente, altrimenti npm come fallback.
 */
export function identifyPackageManager(cwd: string, pkg: PackageJsonLike): PackageManager {
  if (pkg.packageManager?.startsWith('pnpm')) return 'pnpm'
  if (pkg.packageManager?.startsWith('yarn')) return 'yarn'
  if (pkg.packageManager?.startsWith('npm')) return 'npm'

  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn'
  if (existsSync(join(cwd, 'package-lock.json'))) return 'npm'

  return 'npm'
}
