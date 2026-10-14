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

/** Value of `--registry` (and default) that selects the public npm registry: no `.npmrc` is generated. */
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
  /** Backend URL for the dev proxy; empty = not set (shell default, `http://localhost:8000`). */
  proxyTarget: string
  /** Fixed language (`QCLI_APP_LOCALE`, e.g. `it`); empty = automatic detection and language selector. */
  locale: string
  /** Automatic dashboard for routes with children (`QCLI_APP_AUTO_DASHBOARD`). */
  autoDashboard: boolean
  /** Backend response envelope (`QCLI_HTTP_ENVELOPE`); `false` = backend with `PACHIFAST_ENVELOPE_ENABLED=false`. */
  envelope: boolean
  /** Optional `@ilpachi/*` packages (settings/profile/widgets). */
  extras: readonly OptionalPackageKey[]
  /** Local folder of `@ilpachi/pachifastquasar` to link with `link:` (development/testing before publishing). */
  linkDir?: string
  gitInit: boolean
  installDeps: boolean
  /** Registry of the `@ilpachi/*` packages (default: public npm registry); `npm` = public registry. */
  registry?: string
  /** Simulation: computes files and `package.json` without writing or installing anything. */
  dryRun?: boolean
}

/** Result of {@link generateProject}. */
export interface GenerateResult {
  /** `pnpm install` was run (always `false` in dry-run). */
  installDeps: boolean
  /** Dry-run only: relative paths of the files that would be generated (sorted). */
  files?: string[]
  /** Dry-run only: resolved `package.json`. */
  packageJson?: Record<string, unknown>
}

export { buildEnvContent, buildEnvExample }

export class GenerateError extends Error {}

/** `pnpm install` failed: the project was created and stays on disk. */
export class InstallError extends GenerateError {}

/**
 * Registry URL to use for `@ilpachi`, or `undefined` for the public npm registry.
 *
 * @param requested - value of `--registry` (if absent: `PACHI_NPM_REGISTRY`, then the public npm registry)
 * @throws GenerateError if the value is neither `npm` nor an http(s) URL
 */
export function resolveRegistry(requested?: string): string | undefined {
  const value = (requested ?? process.env.PACHI_NPM_REGISTRY ?? PUBLIC_REGISTRY_KEYWORD).trim()
  if (value === PUBLIC_REGISTRY_KEYWORD || value === '') return undefined
  if (!/^https?:\/\/[^\s]+$/.test(value)) {
    throw new GenerateError(`Invalid registry: "${value}". Use an http(s) URL or "${PUBLIC_REGISTRY_KEYWORD}" for the public registry.`)
  }
  return value
}

function log(message: string): void {
  console.log(message)
}

/**
 * Writes the project's `.npmrc`: with a registry, the `@ilpachi` scope line (no token), with
 * `--registry npm` no file.
 */
async function writeNpmrc(targetDir: string, registry: string | undefined): Promise<void> {
  const { content } = mergeNpmrc(undefined, registry)
  if (content !== null) await writeFile(path.join(targetDir, '.npmrc'), content, 'utf-8')
}

/** Writes a string as a TypeScript literal with single quotes. */
function tsLiteral(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

/**
 * Second argument of `definePachiQuasarConfig` in `quasar.config.ts`: with a proxy set it writes it
 * (the `QCLI_PROXY_TARGET` environment variable still takes precedence), otherwise nothing (shell default).
 *
 * @param proxyTarget - backend URL, empty if not set
 */
export function buildPresetOptions(proxyTarget: string): string {
  return proxyTarget ? `, { proxyTarget: process.env.QCLI_PROXY_TARGET ?? ${tsLiteral(proxyTarget)} }` : ''
}

/** Preamble and overrides of `quasar.config.ts` with `--link`: a single copy of the singletons for the typecheck. */
const LINK_CONFIG_PREAMBLE = `// Development with --link: the shell is an external folder with its own node_modules, so TypeScript would see
// two copies of the singletons (incompatible types). They all point to the app's dependencies; with the package
// installed from the registry none of this is needed and it can be removed.
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
 * Values of the placeholders of the app templates.
 *
 * @param options - generation options
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
 * Validates the options that do not depend on the filesystem.
 *
 * @throws GenerateError if invalid
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
 * `@ilpachi/*` packages for which, with `--link`, a sibling folder of the shell's exists.
 *
 * @param linkDir - local folder of the shell
 * @param names - full names of the packages searched for
 */
function findLinkableSiblings(linkDir: string, names: readonly string[]): string[] {
  const parent = path.dirname(linkDir)
  return names.filter((name) => existsSync(path.join(parent, name.split('/')[1] as string, 'package.json')))
}

/**
 * Checks that `--link` points to a folder with the shell package.
 *
 * @param linkDir - absolute path
 * @throws GenerateError if it is missing or is not `@ilpachi/pachifastquasar`
 */
async function assertShellDir(linkDir: string): Promise<void> {
  try {
    const pkg = JSON.parse(await readFile(path.join(linkDir, 'package.json'), 'utf-8')) as { name?: string }
    if (pkg.name === SHELL_PACKAGE) return
    throw new GenerateError(`"${linkDir}" is not the ${SHELL_PACKAGE} package (name: "${pkg.name ?? '?'}").`)
  } catch (error) {
    if (error instanceof GenerateError) throw error
    throw new GenerateError(`--link: no readable package.json in "${linkDir}".`)
  }
}

/**
 * Checks, read-only, that the required `@ilpachi/*` packages are on the registry.
 *
 * @param packages - `@ilpachi/*` dependencies of the project
 * @param registry - registry to query
 * @returns the unavailable names
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
    execFileSync('git', ['commit', '-m', 'chore: scaffold with pachifq (@ilpachi/pachifastquasar)'], {
      cwd: targetDir,
      stdio: 'ignore',
    })
  } catch {
    log('⚠ git init/commit skipped (git not configured or not available). You can do it by hand later.')
  }
}

async function installDependencies(targetDir: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', ['install'], { cwd: targetDir, stdio: 'inherit', shell: USE_SHELL })
    child.on('error', (error) => reject(new InstallError(`Unable to run "pnpm install": ${error.message}. Run it by hand in the project folder.`)))
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new InstallError(`"pnpm install" exited with code ${code}. Run it by hand in the project folder.`))
    })
  })
}

/** Removes what this run created in `targetDir` (the whole folder, or only the contents if it pre-existed and was empty). */
async function cleanupTarget(targetDir: string, createdDir: boolean): Promise<void> {
  try {
    if (createdDir) {
      await rm(targetDir, { recursive: true, force: true })
    } else {
      for (const entry of await readdir(targetDir)) await rm(path.join(targetDir, entry), { recursive: true, force: true })
    }
  } catch {
    // best-effort cleanup: the original error is the one to show
  }
}

/**
 * Generates a new app from the embedded templates (`templates/app`): static files with placeholders, `package.json`
 * with the `@ilpachi/pachifastquasar` dependency (registry range or `link:` with `--link`), `pnpm-workspace.yaml`,
 * `.npmrc` (only with a registry other than the public one, without a token) and `src/.env`.
 * If something fails after the files are created, the folder created by this run is removed
 * (this does not happen for a `pnpm install` error: the project stays and must be installed by hand).
 *
 * With `dryRun` it writes and installs nothing: it returns the list of files and the resolved `package.json`.
 *
 * @returns `installDeps`: whether `pnpm install` was run (false also if the packages are not published)
 * @throws InstallError if `pnpm install` fails (project already created)
 */
export async function generateProject(options: GenerateOptions): Promise<GenerateResult> {
  const registry = resolveRegistry(options.registry)
  validateOptions(options)
  const linkDir = options.linkDir ? path.resolve(options.linkDir) : undefined
  if (linkDir) await assertShellDir(linkDir)

  const targetStat = await stat(options.targetDir).catch(() => undefined)
  if (targetStat && !targetStat.isDirectory()) {
    throw new GenerateError(`"${options.targetDir}" already exists and is a file, not a folder: choose another name.`)
  }
  if (targetStat) {
    const contents = await readdir(options.targetDir)
    if (contents.length > 0) {
      throw new GenerateError(`The folder "${options.targetDir}" already exists and is not empty.`)
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
    log('📦 Writing the app files from the templates…')
    await writeTemplates(appTemplateDir(), options.targetDir, buildTemplateVars(options))

    log('✏️  Writing package.json, pnpm-workspace.yaml, .npmrc, src/.env…')
    const pkg = buildPkg()
    await writeFile(path.join(options.targetDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
    await writeFile(path.join(options.targetDir, 'pnpm-workspace.yaml'), buildPnpmWorkspace(), 'utf-8')
    await writeNpmrc(options.targetDir, registry)
    await writeEnvFiles(options.targetDir, options)

    // Only registry packages (`link:` ones are local) need to be checked.
    const scoped = readScopedDependencies(pkg).filter((dep) => !dep.range.startsWith('link:'))
    if (linkDir) log(`🔗 ${SHELL_PACKAGE} linked to ${linkDir}`)
    if (scoped.length > 0) {
      log(`🔎 Checking ${scoped.length} @ilpachi/* packages on the registry (read-only)…`)
      const missing = await findUnpublished(scoped, registry)
      if (missing.length > 0) {
        log(`⚠️  Not yet published on the registry: ${missing.join(', ')}. Skipping "pnpm install": check the registry (--registry) or use --link, then run "pnpm install".`)
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
    log('📥 pnpm install (may take a few minutes)…')
    await installDependencies(options.targetDir)
  }
  return { installDeps: options.installDeps }
}
