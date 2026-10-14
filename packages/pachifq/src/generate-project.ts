import { execFileSync, spawn } from 'node:child_process'
import { rm, readdir, mkdir, stat, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { isPublishedOnRegistry, readScopedDependencies } from './helper/workspace-packages.js'
import { buildBootBlocks } from './helper/boot-blocks.js'
import { buildEnvContent, buildEnvExample } from './helper/env-content.js'
import { mergeNpmrc } from './helper/npmrc.js'
import { buildPnpmWorkspace } from './helper/pnpm-workspace.js'
import { appTemplateDir, listTemplateFiles, outputPathOf, writeTemplates } from './helper/template.js'
import { buildAppPackageJson, OPTIONAL_PACKAGES, SHELL_PACKAGE, BASE_PACKAGES, type OptionalPackageKey } from './helper/app-package.js'
import { validateLocaleCode } from './helper/locales.js'
import { USE_SHELL } from './helper/process.js'

/** Valore di `--registry` (e default) che seleziona il registry npm pubblico: nessun `.npmrc` generato. */
export const PUBLIC_REGISTRY_KEYWORD = 'npm'

export interface AuthMenuOptions {
  profile: boolean
  settings: boolean
  home: boolean
}

export interface GenerateOptions {
  targetDir: string
  packageName: string
  productName: string
  description: string
  author: string
  authEnabled: boolean
  authMenu: AuthMenuOptions
  /** URL del backend per il proxy dev; vuoto = non impostato (default della shell, `http://localhost:8000`). */
  proxyTarget: string
  /** Lingua fissa (`QCLI_APP_LOCALE`, es. `it`); vuoto = rilevamento automatico e selettore lingua. */
  locale: string
  /** Dashboard automatica per le route con figli (`QCLI_APP_AUTO_DASHBOARD`). */
  autoDashboard: boolean
  /** Envelope delle risposte del backend (`QCLI_HTTP_ENVELOPE`); `false` = backend con `PACHIFAST_ENVELOPE_ENABLED=false`. */
  envelope: boolean
  /** Package `@ilpachi/*` opzionali (settings/profile/widgets). */
  extras: readonly OptionalPackageKey[]
  /** Cartella locale di `@ilpachi/pachifastquasar` da collegare con `link:` (sviluppo/test prima della pubblicazione). */
  linkDir?: string
  gitInit: boolean
  installDeps: boolean
  /** Registry dei package `@ilpachi/*` (default: registry pubblico npm); `npm` = registry pubblico. */
  registry?: string
  /** Simulazione: calcola file e `package.json` senza scrivere nulla né installare. */
  dryRun?: boolean
}

/** Esito di {@link generateProject}. */
export interface GenerateResult {
  /** `pnpm install` eseguito (sempre `false` in dry-run). */
  installDeps: boolean
  /** Solo in dry-run: percorsi relativi dei file che verrebbero generati (ordinati). */
  files?: string[]
  /** Solo in dry-run: `package.json` risolto. */
  packageJson?: Record<string, unknown>
}

export { buildEnvContent, buildEnvExample }

export class GenerateError extends Error {}

/** `pnpm install` fallito: il progetto è stato creato e resta sul disco. */
export class InstallError extends GenerateError {}

/**
 * URL del registry da usare per `@ilpachi`, oppure `undefined` per il registry pubblico di npm.
 *
 * @param requested - valore di `--registry` (se assente: `PACHI_NPM_REGISTRY`, poi il registry pubblico npm)
 * @throws GenerateError se il valore non è `npm` né un URL http(s)
 */
export function resolveRegistry(requested?: string): string | undefined {
  const value = (requested ?? process.env.PACHI_NPM_REGISTRY ?? PUBLIC_REGISTRY_KEYWORD).trim()
  if (value === PUBLIC_REGISTRY_KEYWORD || value === '') return undefined
  if (!/^https?:\/\/[^\s]+$/.test(value)) {
    throw new GenerateError(`Registry non valido: "${value}". Usa un URL http(s) oppure "${PUBLIC_REGISTRY_KEYWORD}" per il registry pubblico.`)
  }
  return value
}

function log(message: string): void {
  console.log(message)
}

/**
 * Scrive il `.npmrc` del progetto: con un registry la riga dello scope `@ilpachi` (senza token), con
 * `--registry npm` nessun file.
 */
async function writeNpmrc(targetDir: string, registry: string | undefined): Promise<void> {
  const { content } = mergeNpmrc(undefined, registry)
  if (content !== null) await writeFile(path.join(targetDir, '.npmrc'), content, 'utf-8')
}

/** Scrive una stringa come letterale TypeScript con apici singoli. */
function tsLiteral(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

/**
 * Secondo argomento di `definePachiQuasarConfig` in `quasar.config.ts`: con un proxy impostato lo scrive
 * (la variabile `QCLI_PROXY_TARGET` dell'ambiente ha comunque la precedenza), altrimenti nulla (default della shell).
 *
 * @param proxyTarget - URL del backend, vuoto se non impostato
 */
export function buildPresetOptions(proxyTarget: string): string {
  return proxyTarget ? `, { proxyTarget: process.env.QCLI_PROXY_TARGET ?? ${tsLiteral(proxyTarget)} }` : ''
}

/** Preambolo e override di `quasar.config.ts` con `--link`: una sola copia dei singleton per il typecheck. */
const LINK_CONFIG_PREAMBLE = `// Sviluppo con --link: la shell è una cartella esterna con le proprie node_modules, quindi TypeScript vedrebbe
// due copie dei singleton (tipi incompatibili). Si puntano tutti alle dipendenze dell'app; con il package
// installato dal registry tutto questo non serve e si può togliere.
const SINGLETONS = ['vue', 'vue-router', 'vue-i18n', 'pinia', 'quasar', 'alova', '@quasar/extras', '@ilpachi/use-alova', '@ilpachi/pachi-i18n']

`

const LINK_CONFIG_OVERRIDES = `{
  build: {
    typescript: {
      extendTsConfig(tsConfig: Record<string, any>) {
        tsConfig.compilerOptions ??= {}
        tsConfig.compilerOptions.paths = {
          ...tsConfig.compilerOptions.paths,
          ...Object.fromEntries(SINGLETONS.map((name) => [name, [\`./../node_modules/\${name}\`]]))
        }
      }
    }
  }
}`

/**
 * Valori dei segnaposto dei template dell'app.
 *
 * @param options - opzioni di generazione
 */
export function buildTemplateVars(options: GenerateOptions): Record<string, string> {
  return {
    productName: options.productName,
    description: options.description,
    htmlLang: options.locale || 'it',
    presetOptions: buildPresetOptions(options.proxyTarget),
    configPreamble: options.linkDir ? LINK_CONFIG_PREAMBLE : '',
    configOverrides: options.linkDir ? LINK_CONFIG_OVERRIDES : '{}',
    ...buildBootBlocks(options.extras),
  }
}

/**
 * Valida le opzioni che non dipendono dal filesystem.
 *
 * @throws GenerateError se non valide
 */
function validateOptions(options: GenerateOptions): void {
  if (options.locale) {
    try {
      validateLocaleCode(options.locale)
    } catch (error) {
      throw new GenerateError(error instanceof Error ? error.message : String(error))
    }
  }
}

/**
 * Package `@ilpachi/*` per cui con `--link` esiste una cartella sorella di quella della shell.
 *
 * @param linkDir - cartella locale della shell
 * @param names - nomi completi dei package cercati
 */
function findLinkableSiblings(linkDir: string, names: readonly string[]): string[] {
  const parent = path.dirname(linkDir)
  return names.filter((name) => existsSync(path.join(parent, name.split('/')[1] as string, 'package.json')))
}

/**
 * Verifica che `--link` punti a una cartella con il package della shell.
 *
 * @param linkDir - percorso assoluto
 * @throws GenerateError se manca o non è `@ilpachi/pachifastquasar`
 */
async function assertShellDir(linkDir: string): Promise<void> {
  try {
    const pkg = JSON.parse(await readFile(path.join(linkDir, 'package.json'), 'utf-8')) as { name?: string }
    if (pkg.name === SHELL_PACKAGE) return
    throw new GenerateError(`"${linkDir}" non è il package ${SHELL_PACKAGE} (name: "${pkg.name ?? '?'}").`)
  } catch (error) {
    if (error instanceof GenerateError) throw error
    throw new GenerateError(`--link: nessun package.json leggibile in "${linkDir}".`)
  }
}

/**
 * Verifica in sola lettura che i package `@ilpachi/*` richiesti siano sul registry.
 *
 * @param packages - dipendenze `@ilpachi/*` del progetto
 * @param registry - registry da interrogare
 * @returns i nomi non disponibili
 */
async function findUnpublished(packages: { name: string; range: string }[], registry?: string): Promise<string[]> {
  const checks = await Promise.all(
    packages.map(async (pkg) => [pkg.name, await isPublishedOnRegistry(pkg.name, pkg.range, registry)] as const),
  )
  return checks.filter(([, ok]) => !ok).map(([name]) => name)
}

async function writeEnvFiles(targetDir: string, options: GenerateOptions): Promise<void> {
  await writeFile(path.join(targetDir, 'src', '.env'), buildEnvContent(options), 'utf-8')
  await writeFile(path.join(targetDir, 'src', '.env.example'), buildEnvExample(), 'utf-8')
}

function tryGitInit(targetDir: string): void {
  try {
    execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' })
    execFileSync('git', ['add', '-A'], { cwd: targetDir, stdio: 'ignore' })
    execFileSync('git', ['commit', '-m', 'chore: scaffold con pachifq (@ilpachi/pachifastquasar)'], {
      cwd: targetDir,
      stdio: 'ignore',
    })
  } catch {
    log('⚠ git init/commit saltato (git non configurato o non disponibile). Puoi farlo a mano dopo.')
  }
}

async function installDependencies(targetDir: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', ['install'], { cwd: targetDir, stdio: 'inherit', shell: USE_SHELL })
    child.on('error', (error) => reject(new InstallError(`Impossibile eseguire "pnpm install": ${error.message}. Eseguilo a mano nella cartella del progetto.`)))
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new InstallError(`"pnpm install" terminato con codice ${code}. Eseguilo a mano nella cartella del progetto.`))
    })
  })
}

/** Rimuove ciò che questo run ha creato in `targetDir` (la cartella intera, o il solo contenuto se preesistente e vuota). */
async function cleanupTarget(targetDir: string, createdDir: boolean): Promise<void> {
  try {
    if (createdDir) {
      await rm(targetDir, { recursive: true, force: true })
    } else {
      for (const entry of await readdir(targetDir)) await rm(path.join(targetDir, entry), { recursive: true, force: true })
    }
  } catch {
    // pulizia best effort: l'errore originale resta quello da mostrare
  }
}

/**
 * Genera una nuova app dai template embedded (`templates/app`): file statici con segnaposto, `package.json`
 * con la dipendenza `@ilpachi/pachifastquasar` (range dal registry o `link:` con `--link`), `pnpm-workspace.yaml`,
 * `.npmrc` (solo con un registry diverso da quello pubblico, senza token) e `src/.env`.
 * Se qualcosa fallisce dopo la creazione dei file, la cartella creata da questo run viene rimossa
 * (non succede per un errore di `pnpm install`: il progetto resta e va installato a mano).
 *
 * Con `dryRun` non scrive né installa nulla: restituisce l'elenco dei file e il `package.json` risolto.
 *
 * @returns `installDeps`: se `pnpm install` è stato eseguito (false anche se i package non sono pubblicati)
 * @throws InstallError se `pnpm install` fallisce (progetto già creato)
 */
export async function generateProject(options: GenerateOptions): Promise<GenerateResult> {
  const registry = resolveRegistry(options.registry)
  validateOptions(options)
  const linkDir = options.linkDir ? path.resolve(options.linkDir) : undefined
  if (linkDir) await assertShellDir(linkDir)

  const targetStat = await stat(options.targetDir).catch(() => undefined)
  if (targetStat && !targetStat.isDirectory()) {
    throw new GenerateError(`"${options.targetDir}" esiste già ed è un file, non una cartella: scegli un altro nome.`)
  }
  if (targetStat) {
    const contents = await readdir(options.targetDir)
    if (contents.length > 0) {
      throw new GenerateError(`La cartella "${options.targetDir}" esiste già e non è vuota.`)
    }
  }
  const createdDir = targetStat === undefined
  const scopedNames = [SHELL_PACKAGE, ...Object.keys(BASE_PACKAGES), ...options.extras.map((key) => OPTIONAL_PACKAGES[key].name)]
  const buildPkg = () =>
    buildAppPackageJson({
      packageName: options.packageName,
      productName: options.productName,
      description: options.description,
      author: options.author,
      extras: options.extras,
      targetDir: options.targetDir,
      ...(linkDir && { linkDir, linkedSiblings: findLinkableSiblings(linkDir, scopedNames) }),
    })

  if (options.dryRun) {
    const templateFiles = (await listTemplateFiles(appTemplateDir())).map(outputPathOf)
    const files = [
      ...templateFiles,
      'package.json',
      'pnpm-workspace.yaml',
      ...(registry ? ['.npmrc'] : []),
      'src/.env',
      'src/.env.example',
    ].sort((a, b) => a.localeCompare(b))
    return { installDeps: false, files, packageJson: buildPkg() as unknown as Record<string, unknown> }
  }

  try {
    await mkdir(options.targetDir, { recursive: true })
    log('📦 Scrittura dei file dell\'app dai template…')
    await writeTemplates(appTemplateDir(), options.targetDir, buildTemplateVars(options))

    log('✏️  Scrittura package.json, pnpm-workspace.yaml, .npmrc, src/.env…')
    const pkg = buildPkg()
    await writeFile(path.join(options.targetDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
    await writeFile(path.join(options.targetDir, 'pnpm-workspace.yaml'), buildPnpmWorkspace(), 'utf-8')
    await writeNpmrc(options.targetDir, registry)
    await writeEnvFiles(options.targetDir, options)

    // Solo i package da registry (i `link:` sono locali) vanno verificati.
    const scoped = readScopedDependencies(pkg).filter((dep) => !dep.range.startsWith('link:'))
    if (linkDir) log(`🔗 ${SHELL_PACKAGE} collegato a ${linkDir}`)
    if (scoped.length > 0) {
      log(`🔎 Verifica sul registry (sola lettura) di ${scoped.length} package @ilpachi/*…`)
      const missing = await findUnpublished(scoped, registry)
      if (missing.length > 0) {
        log(`⚠️  Non ancora pubblicati sul registry: ${missing.join(', ')}. Salto "pnpm install": controlla il registry (--registry) o usa --link, poi esegui "pnpm install".`)
        options = { ...options, installDeps: false }
      }
    }

    if (options.gitInit) {
      log('🔧 git init…')
      tryGitInit(options.targetDir)
    }
  } catch (error) {
    await cleanupTarget(options.targetDir, createdDir)
    throw error
  }

  if (options.installDeps) {
    log('📥 pnpm install (può richiedere qualche minuto)…')
    await installDependencies(options.targetDir)
  }
  return { installDeps: options.installDeps }
}
