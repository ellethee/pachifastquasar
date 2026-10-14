import path from 'node:path'

/** Optional `@ilpachi/*` packages selectable with `--with` (short name → package and range). */
export const OPTIONAL_PACKAGES = {
  settings: { name: '@ilpachi/fastquasar-settings', range: '^0.1.0', label: 'User settings' },
  profile: { name: '@ilpachi/fastquasar-profile', range: '^0.1.0', label: 'User profile' },
  widgets: { name: '@ilpachi/fastquasar-dashboard-widgets', range: '^0.1.0', label: 'Dashboard widgets (activity/system)' },
} as const

/** Short name of an optional package. */
export type OptionalPackageKey = keyof typeof OPTIONAL_PACKAGES

/** Shell package. */
export const SHELL_PACKAGE = '@ilpachi/pachifastquasar'
/** Shell range in the generated apps (0.x: the minor is the compatibility limit). */
export const SHELL_RANGE = '^0.1.0'

/** `@ilpachi/*` packages that are always present (shell peers) with their range. */
export const BASE_PACKAGES: Record<string, string> = {
  '@ilpachi/pachi-i18n': '^0.1.0',
  '@ilpachi/use-alova': '^2.1.1',
}

/** Third-party dependencies of the app (shell peers and Quasar toolchain). */
const THIRD_PARTY_DEPENDENCIES: Record<string, string> = {
  '@quasar/extras': '^2.0.1',
  alova: '^3.3.0',
  pinia: '^4.0.3',
  '@vue/devtools-api': '^8.1.5',
  'pinia-plugin-persistedstate': '^4.7.1',
  quasar: '^2.35.0',
  vue: '^3.5.35',
  'vue-i18n': '^11.4.14',
  'vue-router': '^5.4.0',
}

const THIRD_PARTY_DEV_DEPENDENCIES: Record<string, string> = {
  '@quasar/app-vite': '^3.10.2',
  '@quasar/vite-plugin': '^2.0.2',
  '@types/node': '^20.19.41',
  autoprefixer: '^10.5.0',
  esbuild: '^0.28.2',
  typescript: '^5.9.3',
  'vue-tsc': '^3.3.13',
}

/** Values to write the app's `package.json`. */
export interface AppPackageInput {
  packageName: string
  productName: string
  description: string
  author: string
  /** Chosen optional packages. */
  extras: readonly OptionalPackageKey[]
  /** If present: local folder of the shell (`link:`); the sibling `@ilpachi/*` dependencies are linked. */
  linkDir?: string
  /** Project folder (used to make the `link:` paths relative). */
  targetDir: string
  /** Names of the `@ilpachi/*` packages that have a sibling folder to link (only with `linkDir`). */
  linkedSiblings?: readonly string[]
}

/**
 * Relative `link:` path (with `/`) from the project folder to a local folder.
 *
 * @param targetDir - project folder
 * @param dir - folder to link
 */
export function linkSpec(targetDir: string, dir: string): string {
  const rel = path.relative(targetDir, dir).split(path.sep).join('/')
  return `link:${rel || '.'}`
}

/**
 * `@ilpachi/*` dependencies of the app (sorted by name), with `link:` for the shell and for the sibling packages
 * listed in `linkedSiblings` when `--link` is used.
 *
 * @param input - app values
 */
export function buildScopedDependencies(input: AppPackageInput): Record<string, string> {
  const ranges: Record<string, string> = { [SHELL_PACKAGE]: SHELL_RANGE, ...BASE_PACKAGES }
  for (const key of input.extras) ranges[OPTIONAL_PACKAGES[key].name] = OPTIONAL_PACKAGES[key].range
  if (input.linkDir) {
    ranges[SHELL_PACKAGE] = linkSpec(input.targetDir, input.linkDir)
    const parent = path.dirname(input.linkDir)
    for (const name of input.linkedSiblings ?? []) {
      if (name in ranges) ranges[name] = linkSpec(input.targetDir, path.join(parent, name.split('/')[1] as string))
    }
  }
  return Object.fromEntries(Object.entries(ranges).sort(([a], [b]) => a.localeCompare(b)))
}

/**
 * `package.json` of the generated app (private, ESM, `dev`/`build`/`typecheck` scripts).
 *
 * @param input - app values
 */
export function buildAppPackageJson(input: AppPackageInput): Record<string, unknown> {
  const dependencies = Object.fromEntries(
    Object.entries({ ...buildScopedDependencies(input), ...THIRD_PARTY_DEPENDENCIES }).sort(([a], [b]) => a.localeCompare(b)),
  )
  return {
    name: input.packageName,
    version: '0.0.1',
    description: input.description,
    productName: input.productName,
    author: input.author,
    private: true,
    type: 'module',
    scripts: {
      dev: 'quasar dev',
      build: 'quasar build',
      typecheck: 'quasar prepare && vue-tsc --noEmit',
    },
    dependencies,
    devDependencies: THIRD_PARTY_DEV_DEPENDENCIES,
    engines: { node: '>=20', pnpm: '>=10' },
  }
}
