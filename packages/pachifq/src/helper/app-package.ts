import path from 'node:path'

/** Package `@ilpachi/*` opzionali selezionabili con `--with` (nome breve → package e range). */
export const OPTIONAL_PACKAGES = {
  settings: { name: '@ilpachi/fastquasar-settings', range: '^0.1.0', label: 'Impostazioni utente' },
  profile: { name: '@ilpachi/fastquasar-profile', range: '^0.1.0', label: 'Profilo utente' },
  widgets: { name: '@ilpachi/fastquasar-dashboard-widgets', range: '^0.1.0', label: 'Widget dashboard (attività/sistema)' },
} as const

/** Nome breve di un package opzionale. */
export type OptionalPackageKey = keyof typeof OPTIONAL_PACKAGES

/** Package della shell. */
export const SHELL_PACKAGE = '@ilpachi/pachifastquasar'
/** Range della shell nelle app generate (0.x: la minor è il limite di compatibilità). */
export const SHELL_RANGE = '^0.1.0'

/** Package `@ilpachi/*` sempre presenti (peer della shell) con il loro range. */
export const BASE_PACKAGES: Record<string, string> = {
  '@ilpachi/pachi-i18n': '^0.1.0',
  '@ilpachi/use-alova': '^2.1.1',
}

/** Dipendenze di terze parti dell'app (peer della shell e toolchain Quasar). */
const THIRD_PARTY_DEPENDENCIES: Record<string, string> = {
  '@quasar/extras': '^2.0.1',
  alova: '^3.3.0',
  pinia: '^3.0.4',
  'pinia-plugin-persistedstate': '^4.7.1',
  quasar: '^2.20.0',
  vue: '^3.5.35',
  'vue-i18n': '^11.4.4',
  'vue-router': '^5.1.0',
}

const THIRD_PARTY_DEV_DEPENDENCIES: Record<string, string> = {
  '@quasar/app-vite': '^3.10.2',
  '@quasar/vite-plugin': '^2.0.2',
  '@types/node': '^20.19.41',
  autoprefixer: '^10.5.0',
  esbuild: '^0.27.7',
  typescript: '^5.9.3',
  'vue-tsc': '^3.3.2',
}

/** Valori per scrivere il `package.json` dell'app. */
export interface AppPackageInput {
  packageName: string
  productName: string
  description: string
  author: string
  /** Package opzionali scelti. */
  extras: readonly OptionalPackageKey[]
  /** Se presente: cartella locale della shell (`link:`); le dipendenze `@ilpachi/*` sorelle vengono collegate. */
  linkDir?: string
  /** Cartella del progetto (serve a rendere relativi i `link:`). */
  targetDir: string
  /** Nomi dei package `@ilpachi/*` per cui esiste una cartella sorella da collegare (solo con `linkDir`). */
  linkedSiblings?: readonly string[]
}

/**
 * Percorso `link:` relativo (con `/`) dalla cartella del progetto a una cartella locale.
 *
 * @param targetDir - cartella del progetto
 * @param dir - cartella da collegare
 */
export function linkSpec(targetDir: string, dir: string): string {
  const rel = path.relative(targetDir, dir).split(path.sep).join('/')
  return `link:${rel || '.'}`
}

/**
 * Dipendenze `@ilpachi/*` dell'app (ordinate per nome), con `link:` per la shell e per i package sorelle
 * indicati in `linkedSiblings` quando si usa `--link`.
 *
 * @param input - valori dell'app
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
 * `package.json` dell'app generata (privato, ESM, script `dev`/`build`/`typecheck`).
 *
 * @param input - valori dell'app
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
