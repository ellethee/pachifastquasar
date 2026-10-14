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
${pc.bold('pachifq info')} - Mostra informazioni diagnostiche sul progetto corrente

${pc.bold('Usage')}
  $ pachifq info [--json]
  $ pachifq i [--json]

${pc.bold('Options')}
  --json       Output leggibile da macchina
  -h, --help   Mostra questo aiuto
`

/** Target del proxy backend usato se QCLI_PROXY_TARGET non è impostato. */
export const DEFAULT_PROXY_TARGET = 'http://localhost:8000'

/** Stato di un package `@ilpachi/*` del progetto. */
export interface PachiPackageStatus {
  name: string
  range: string
  /**
   * Versione installata, `workspace` (il package è in `packages/` del progetto: un progetto può averne di
   * propri) oppure `NON installato`.
   */
  status: string
}

/**
 * Auth abilitata salvo che QCLI_AUTH_ENABLED o VITE_AUTH_ENABLED siano `false`.
 * Per ciascuna chiave vale la precedenza process.env > .env.local > .env.
 */
function isAuthEnabled(cwd: string): boolean {
  return readEnvValue(cwd, 'QCLI_AUTH_ENABLED') !== 'false' && readEnvValue(cwd, 'VITE_AUTH_ENABLED') !== 'false'
}

/**
 * Legge la versione installata di un package da node_modules.
 *
 * @param cwd - root del progetto
 * @param name - nome del package
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
 * Elenca le dipendenze `@ilpachi/*` del progetto con range e stato di installazione.
 *
 * @param cwd - root del progetto
 * @param ctx - contesto del progetto
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
      const status = inWorkspace ? 'workspace' : (installed ?? 'NON installato')
      return { name, range, status }
    })
}

function resolveQuasarVersion(cwd: string, ctx: ProjectContext | undefined): string {
  const installed = readInstalledVersion(cwd, 'quasar')
  if (installed) return `${installed} (installata)`
  const declared = ctx?.pkg.dependencies?.quasar ?? ctx?.pkg.devDependencies?.quasar
  return declared ? `non installata (range dichiarato ${declared})` : 'non trovata'
}

/**
 * Codici lingua dei file `<codice>.json` di una cartella.
 *
 * @param dir - cartella (es. `src/i18n/generated`)
 */
function listJsonCodes(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((name) => name.endsWith('.json')).map((name) => name.replace(/\.json$/, '')).sort()
}

/**
 * Comando `pachifq info`: diagnostica del progetto corrente.
 *
 * @param argv - argomenti dopo il nome del comando
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
    // info resta utile anche fuori da un progetto pachifastquasar: continua senza ctx
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
    `Auth abilitata  ${authEnabled ? 'sì' : 'no'} (process.env > .env.local > .env)`,
    `Proxy backend   ${proxyTarget}`,
    `OS/Arch         ${process.platform}/${process.arch}`,
  ]

  if (!ctx) {
    lines.push('', pc.yellow(`Attenzione: "${cwd}" non sembra un progetto pachifastquasar (info parziali).`))
  } else {
    lines.push(
      '',
      shell
        ? `Shell            ${SHELL_PACKAGE} ${shell.range} (${shell.status})`
        : pc.yellow(`Shell            ${SHELL_PACKAGE} non è una dipendenza (app derivata dal vecchio boilerplate?)`),
    )
    if (shell) {
      lines.push('', 'Opzioni QCLI_* (grassetto = impostate; le altre sono i default della shell)')
      for (const o of options) lines.push(`  ${o.set ? pc.bold(o.key.padEnd(31)) : o.key.padEnd(31)} ${o.value === '' ? '(vuoto)' : o.value}`)
    }
    lines.push('', `Pacchetti @ilpachi (${packages.length})`)
    if (packages.length === 0) lines.push('  (nessuno)')
    for (const pkg of packages) {
      const status = pkg.status === 'NON installato' ? pc.yellow(pkg.status) : pkg.status
      lines.push(`  - ${pkg.name.padEnd(36)} ${pkg.range.padEnd(12)} ${status}`)
    }
    lines.push('', `Lingue dell'app (src/i18n/locales)  ${locales.length > 0 ? locales.join(', ') : '(nessuna: solo it/en della shell)'}`)
    lines.push(`Lingue generate (src/i18n/generated)  ${generatedLocales.length > 0 ? generatedLocales.join(', ') : '(nessuna)'}`)
    lines.push('', `Feature trovate in src/features/ (${features.length})`, ...formatFeatureLines(features))
  }

  console.log(lines.join('\n'))
}
