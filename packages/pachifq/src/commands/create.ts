import path from 'node:path'
import * as clack from '@clack/prompts'
import { generateProject, GenerateError, InstallError } from '../generate-project.js'
import { OPTIONAL_PACKAGES, type OptionalPackageKey } from '../helper/app-package.js'
import { runPrompts } from '../prompts-project.js'
import pc from 'picocolors'
import { ArgvCursor, ArgvError, splitFlag } from '../helper/argv.js'
import {
  assertPlainProjectName,
  packageNameFromProject,
  ProjectNameError,
  resolveTargetDir,
} from '../helper/project-name.js'

export const HELP = `
${pc.bold('pachifq create')} - Generate a new app that depends on @ilpachi/pachifastquasar

${pc.bold('Usage')}
  $ pachifq create [project-name] [options]
  $ pachifq c [project-name] [options]

${pc.bold('Options')}
  --yes                Skip the prompts, use the defaults (backend proxy: shell default)
                       Options also accept the --option=value form.
  --link <path>        Link @ilpachi/pachifastquasar to a local folder with "link:" (development/testing
                       before publishing). The @ilpachi/* packages present as sibling folders of
                       <path> are linked too; the others stay on the registry.
  --locale <code>      Fixed app language (QCLI_APP_LOCALE, e.g. it): no language selector
  --no-auto-dashboard  Disable the automatic dashboard for routes with children
                       (QCLI_APP_AUTO_DASHBOARD=false)
  --no-envelope        Backend with PACHIFAST_ENVELOPE_ENABLED=false (responses without the
                       success/message/data envelope): writes QCLI_HTTP_ENVELOPE=false to src/.env
  --with <list>       Comma-separated optional packages: ${Object.keys(OPTIONAL_PACKAGES).join(', ')}
                       (settings = user settings, profile = profile, widgets = dashboard widgets)
  --registry <url|npm> Registry of the @ilpachi/* packages (default "npm" = public registry, or the
                       PACHI_NPM_REGISTRY variable): no .npmrc is written. With a URL
                       (private registry or mirror) writes an .npmrc with the @ilpachi scope (no
                       token: the login stays in your ~/.npmrc).
  --dry-run            List the files that would be generated and the resolved package.json, without
                       writing anything or installing
  --no-install          Do not run "pnpm install" at the end
  --no-git              Do not initialize a git repo
  -h, --help            Show this help
`

/** Arguments of `pachifq create` after parsing. */
export interface ParsedArgv {
  projectName?: string
  yes: boolean
  install: boolean
  git: boolean
  registry?: string | undefined
  dryRun: boolean
  link?: string | undefined
  locale?: string | undefined
  autoDashboard: boolean
  envelope: boolean
  extras: OptionalPackageKey[]
  help: boolean
}

/**
 * Converts the value of `--with` (comma-separated list) into the optional packages.
 *
 * @param value - es. `settings,profile`
 * @throws ArgvError for unknown names
 */
export function parseExtras(value: string): OptionalPackageKey[] {
  const keys = [...new Set(value.split(',').map((v) => v.trim()).filter(Boolean))]
  for (const key of keys) {
    if (!(key in OPTIONAL_PACKAGES)) {
      throw new ArgvError(`Unknown optional package: "${key}". Allowed: ${Object.keys(OPTIONAL_PACKAGES).join(', ')}.`)
    }
  }
  return keys as OptionalPackageKey[]
}

/**
 * Parses the arguments of `pachifq create`.
 *
 * @param argv - arguments after `create`
 * @throws ArgvError for unknown options, missing values or extra positional arguments
 */
export function parseArgv(argv: string[]): ParsedArgv {
  const result: ParsedArgv = {
    yes: false,
    autoDashboard: true,
    envelope: true,
    extras: [],
    install: true,
    git: true,
    dryRun: false,
    help: false,
  }
  const cursor = new ArgvCursor(argv)
  while (cursor.hasNext) {
    const arg = cursor.next()
    const split = splitFlag(arg)
    switch (split.flag) {
      case '--ref':
      case '--template':
        throw new ArgvError(`${split.flag} no longer exists (the app is generated from the CLI templates, not cloned): use --link <path> for the local shell.`)
      case '--link':
        result.link = cursor.value(split)
        break
      case '--locale':
        result.locale = cursor.value(split)
        break
      case '--no-auto-dashboard':
        result.autoDashboard = false
        break
      case '--no-envelope':
        result.envelope = false
        break
      case '--with':
        result.extras = parseExtras(cursor.value(split))
        break
      case '--registry':
        result.registry = cursor.value(split)
        break
      case '--dry-run':
        result.dryRun = true
        break
      case '--yes':
        result.yes = true
        break
      case '--no-install':
        result.install = false
        break
      case '--no-git':
        result.git = false
        break
      case '--no-color':
        break
      case '-h':
      case '--help':
        result.help = true
        break
      default:
        if (arg.startsWith('-')) throw new ArgvError(`Unknown option: ${arg}. Run "pachifq create --help".`)
        if (result.projectName !== undefined) throw new ArgvError(`Unexpected argument: "${arg}" (the project name is already "${result.projectName}").`)
        result.projectName = arg
    }
  }
  return result
}

/**
 * Final instructions for the backend error messages (`errors.codes.*`), missing in a new app.
 * The backend path is not known (the proxy is a URL, not a folder): the `<backend>` placeholder stays.
 */
export function errorMessagesHint(): string[] {
  return [
    '',
    pc.bold('Backend error messages (optional)'),
    '  The src/i18n/generated folder is empty: until you export the messages from the backend, errors use',
    '  the fallback text. If you use a pachifast backend, run this from the app folder:',
    '',
    '    pachifast locale export --base-dir <backend> --dest-path src/i18n/generated --namespace errors.codes',
    '',
    '  (add --check to verify the files are not outdated; <backend> = backend project folder)',
  ]
}

/**
 * Prints the `--dry-run` result: target folder, files that would be generated and `package.json`.
 *
 * @param targetDir - target folder (absolute)
 * @param cwd - current folder
 * @param files - relative file paths
 * @param packageJson - resolved `package.json`
 */
function printDryRun(targetDir: string, cwd: string, files: string[], packageJson: Record<string, unknown>): void {
  console.log(`\n${pc.bold('Dry run')}: ${files.length} files would be generated in ${path.relative(cwd, targetDir) || '.'}\n`)
  for (const file of files) console.log(`  ${file}`)
  console.log(`\n${pc.bold('package.json')}\n${JSON.stringify(packageJson, null, 2)}\n`)
  clack.outro(pc.yellow('Dry run: no files written, nothing installed.'))
}

export async function run(argv: string[]): Promise<void> {
  const cwd = process.cwd()
  let parsed: ParsedArgv
  let prompted: Awaited<ReturnType<typeof runPrompts>>
  let targetDir: string
  try {
    parsed = parseArgv(argv)
    if (parsed.help) {
      console.log(HELP)
      return
    }
    if (parsed.projectName !== undefined) assertPlainProjectName(parsed.projectName)

    if (parsed.yes) {
      const projectName = parsed.projectName ?? 'pachifastquasar-app'
      prompted = {
        projectName,
        packageName: packageNameFromProject(projectName),
        productName: parsed.projectName ?? 'PachiFast App',
        description: '',
        author: '',
        authEnabled: true,
        authMenu: { profile: true, settings: true, home: true },
        proxyTarget: '',
        locale: parsed.locale ?? '',
        autoDashboard: parsed.autoDashboard,
        envelope: parsed.envelope,
        extras: parsed.extras,
        gitInit: parsed.git,
        installDeps: parsed.install,
      }
    } else {
      prompted = await runPrompts({
        ...(parsed.projectName !== undefined && { projectName: parsed.projectName }),
        ...(parsed.locale !== undefined && { locale: parsed.locale }),
        autoDashboard: parsed.autoDashboard,
        ...(parsed.envelope === false && { envelope: false }),
        ...(parsed.extras.length > 0 && { extras: parsed.extras }),
        ...(parsed.git === false && { gitInit: false }),
        ...(parsed.install === false && { installDeps: false }),
      })
    }
    targetDir = resolveTargetDir(cwd, prompted.packageName)
  } catch (error) {
    if (error instanceof ArgvError || error instanceof ProjectNameError) {
      clack.log.error(error.message)
      process.exitCode = 1
      return
    }
    throw error
  }

  let installed = prompted.installDeps
  // No spinner: generateProject prints the steps and `pnpm install` writes to the terminal (stdio inherit).
  clack.log.step(parsed.dryRun ? 'Simulation (dry-run): no files will be written…' : 'Scaffolding…')
  try {
    const result = await generateProject({
      ...prompted,
      targetDir,
      ...(parsed.dryRun && { dryRun: true }),
      ...(parsed.registry !== undefined && { registry: parsed.registry }),
      ...(parsed.link !== undefined && { linkDir: path.resolve(cwd, parsed.link) }),
    })
    if (parsed.dryRun) {
      printDryRun(targetDir, cwd, result.files ?? [], result.packageJson ?? {})
      return
    }
    installed = result.installDeps
    clack.log.success('Project created.')
  } catch (error) {
    if (error instanceof InstallError) {
      clack.log.warn(`Project created, but ${error.message}`)
      installed = false
      process.exitCode = 1
    } else {
      clack.log.error(`Scaffolding failed: ${error instanceof GenerateError ? error.message : error instanceof Error ? error.message : String(error)}`)
      process.exitCode = 1
      return
    }
  }

  clack.outro(
    [
      pc.green('✔ Done!'),
      '',
      `  cd ${path.relative(cwd, targetDir) || '.'}`,
      installed ? '  pnpm dev' : '  pnpm install && pnpm dev',
      prompted.proxyTarget
        ? ''
        : pc.yellow('\n⚠ Backend proxy not set: using http://localhost:8000. To change it set QCLI_PROXY_TARGET in src/.env.'),
      ...errorMessagesHint(),
    ]
      .filter(Boolean)
      .join('\n'),
  )
}
