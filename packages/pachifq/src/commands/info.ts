import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import pc from 'picocolors'
import { assertPachiProject, listFeatures, NotAPachiProjectError, type ProjectContext } from '../project-context.js'
import { identifyPackageManager } from '../package-manager.js'
import { formatFeatureLines } from '../helper/features-format.js'
import { PACKAGE_SCOPE } from '../helper/workspace-packages.js'
import { listLocaleCodes } from '../helper/locales.js'
import { readConfiguredProxy, readEnvValue, resolvePachiOptions } from '../helper/pachi-options.js'
import { SHELL_PACKAGE } from '../helper/app-package.js'

const HELP = `
${pc.bold('pachifq info')} - Show diagnostic information about the current project

${pc.bold('Usage')}
  $ pachifq info [--json]
  $ pachifq i [--json]

${pc.bold('Options')}
  --json       Machine-readable output
  -h, --help   Show this help
`

/** Backend proxy target used if QCLI_PROXY_TARGET is not set. */
export const DEFAULT_PROXY_TARGET = 'http://localhost:8000'

/** Status of an `@ilpachi/*` package of the project. */
export interface PachiPackageStatus {
  name: string
  range: string
  /**
   * Installed version, `workspace` (the package is in the project's `packages/`: a project can have its
   * own) or `NOT installed`.
   */
  status: string
}

/**
 * Auth is enabled unless QCLI_AUTH_ENABLED or VITE_AUTH_ENABLED are `false`.
 * For each key the precedence is process.env > .env.local > .env.
 */
function isAuthEnabled(cwd: string): boolean {
  return readEnvValue(cwd, 'QCLI_AUTH_ENABLED') !== 'false' && readEnvValue(cwd, 'VITE_AUTH_ENABLED') !== 'false'
}

/**
 * Reads the installed version of a package from node_modules.
 *
 * @param cwd - project root
 * @param name - package name
 */
function readInstalledVersion(cwd: string, name: string): string | undefined {
  try {
    const raw = readFileSync(path.join(cwd, 'node_modules', name, 'package.json'), 'utf-8')
    return (JSON.parse(raw) as { version?: string }).version
  } catch {
    return undefined
  }
}

/**
 * Lists the project's `@ilpachi/*` dependencies with range and installation status.
 *
 * @param cwd - project root
 * @param ctx - project context
 */
function resolvePachiPackages(cwd: string, ctx: ProjectContext): PachiPackageStatus[] {
  const deps = { ...ctx.pkg.dependencies, ...ctx.pkg.devDependencies }
  return Object.entries(deps)
    .filter(([name]) => name.startsWith(PACKAGE_SCOPE))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, range]) => {
      const dirName = name.split('/').pop() ?? name
      const inWorkspace = existsSync(path.join(cwd, 'packages', dirName, 'package.json'))
      const installed = readInstalledVersion(cwd, name)
      const status = inWorkspace ? 'workspace' : (installed ?? 'NOT installed')
      return { name, range, status }
    })
}

function resolveQuasarVersion(cwd: string, ctx: ProjectContext | undefined): string {
  const installed = readInstalledVersion(cwd, 'quasar')
  if (installed) return `${installed} (installed)`
  const declared = ctx?.pkg.dependencies?.quasar ?? ctx?.pkg.devDependencies?.quasar
  return declared ? `not installed (declared range ${declared})` : 'not found'
}

/**
 * Language codes of the `<code>.json` files in a folder.
 *
 * @param dir - folder (e.g. `src/i18n/generated`)
 */
function listJsonCodes(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((name) => name.endsWith('.json')).map((name) => name.replace(/\.json$/, '')).sort()
}

/**
 * `pachifq info` command: diagnostics for the current project.
 *
 * @param argv - arguments after the command name
 */
export async function run(argv: string[]): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP)
    return
  }
  const json = argv.includes('--json')
  const cwd = process.cwd()

  let ctx: ProjectContext | undefined
  try {
    ctx = assertPachiProject(cwd)
  } catch (error) {
    if (!(error instanceof NotAPachiProjectError)) throw error
    // info is still useful outside a pachifastquasar project: continue without ctx
  }

  const pm = identifyPackageManager(cwd, ctx?.pkg ?? {})
  const quasarVersion = resolveQuasarVersion(cwd, ctx)
  const authEnabled = isAuthEnabled(cwd)
  const proxyTarget = readEnvValue(cwd, 'QCLI_PROXY_TARGET') ?? readConfiguredProxy(cwd) ?? DEFAULT_PROXY_TARGET
  const features = ctx ? listFeatures(ctx.featuresDir) : []
  const packages = ctx ? resolvePachiPackages(cwd, ctx) : []
  const locales = listLocaleCodes(path.join(cwd, 'src', 'i18n', 'locales'))
  const generatedLocales = listJsonCodes(path.join(cwd, 'src', 'i18n', 'generated'))
  const shell = packages.find((pkg) => pkg.name === SHELL_PACKAGE) ?? null
  const options = ctx ? resolvePachiOptions(cwd) : []

  if (json) {
    console.log(
      JSON.stringify(
        {
          node: process.version,
          packageManager: pm,
          quasar: quasarVersion,
          authEnabled,
          proxyTarget,
          os: process.platform,
          arch: process.arch,
          isPachiProject: ctx !== undefined,
          shell,
          options: Object.fromEntries(options.map((o) => [o.key, { value: o.value, set: o.set }])),
          packages,
          locales,
          generatedLocales,
          features,
        },
        null,
        2,
      ),
    )
    return
  }

  const lines = [
    `${pc.bold('pachifq info')}`,
    '',
    `Node            ${process.version}`,
    `Package mgr     ${pm}`,
    `Quasar          ${quasarVersion}`,
    `Auth enabled    ${authEnabled ? 'yes' : 'no'} (process.env > .env.local > .env)`,
    `Backend proxy   ${proxyTarget}`,
    `OS/Arch         ${process.platform}/${process.arch}`,
  ]

  if (!ctx) {
    lines.push('', pc.yellow(`Warning: "${cwd}" does not look like a pachifastquasar project (partial info).`))
  } else {
    lines.push(
      '',
      shell
        ? `Shell            ${SHELL_PACKAGE} ${shell.range} (${shell.status})`
        : pc.yellow(`Shell            ${SHELL_PACKAGE} is not a dependency (app derived from the old boilerplate?)`),
    )
    if (shell) {
      lines.push('', 'QCLI_* options (bold = set; the others are the shell defaults)')
      for (const o of options) lines.push(`  ${o.set ? pc.bold(o.key.padEnd(31)) : o.key.padEnd(31)} ${o.value === '' ? '(empty)' : o.value}`)
    }
    lines.push('', `@ilpachi packages (${packages.length})`)
    if (packages.length === 0) lines.push('  (none)')
    for (const pkg of packages) {
      const status = pkg.status === 'NOT installed' ? pc.yellow(pkg.status) : pkg.status
      lines.push(`  - ${pkg.name.padEnd(36)} ${pkg.range.padEnd(12)} ${status}`)
    }
    lines.push('', `App languages (src/i18n/locales)  ${locales.length > 0 ? locales.join(', ') : '(none: only the shell it/en)'}`)
    lines.push(`Generated languages (src/i18n/generated)  ${generatedLocales.length > 0 ? generatedLocales.join(', ') : '(none)'}`)
    lines.push('', `Features found in src/features/ (${features.length})`, ...formatFeatureLines(features))
  }

  console.log(lines.join('\n'))
}
