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
${pc.bold('pachifq create')} - Genera una nuova app che dipende da @ilpachi/pachifastquasar

${pc.bold('Usage')}
  $ pachifq create [nome-progetto] [opzioni]
  $ pachifq c [nome-progetto] [opzioni]

${pc.bold('Options')}
  --yes                Salta i prompt, usa i default (proxy backend: default della shell)
                       Le opzioni accettano anche la forma --opzione=valore.
  --link <path>        Collega @ilpachi/pachifastquasar a una cartella locale con "link:" (sviluppo/test
                       prima della pubblicazione). Anche i package @ilpachi/* presenti come cartelle
                       sorelle di <path> vengono collegati; gli altri restano dal registry.
  --locale <codice>    Lingua fissa dell'app (QCLI_APP_LOCALE, es. it): niente selettore lingua
  --no-auto-dashboard  Disattiva la dashboard automatica per le route con figli
                       (QCLI_APP_AUTO_DASHBOARD=false)
  --no-envelope        Backend con PACHIFAST_ENVELOPE_ENABLED=false (risposte senza envelope
                       success/message/data): scrive QCLI_HTTP_ENVELOPE=false in src/.env
  --with <lista>       Package opzionali separati da virgola: ${Object.keys(OPTIONAL_PACKAGES).join(', ')}
                       (settings = impostazioni utente, profile = profilo, widgets = widget dashboard)
  --registry <url|npm> Registry dei package @ilpachi/* (default "npm" = registry pubblico, o la
                       variabile PACHI_NPM_REGISTRY): nessun .npmrc viene scritto. Con un URL
                       (registry privato o mirror) scrive .npmrc con lo scope @ilpachi (senza
                       token: il login resta nel tuo ~/.npmrc).
  --dry-run            Elenca i file che verrebbero generati e il package.json risolto, senza
                       scrivere nulla né installare
  --no-install          Non eseguire "pnpm install" al termine
  --no-git              Non inizializzare un repo git
  -h, --help            Mostra questo aiuto
`

/** Argomenti di `pachifq create` dopo il parsing. */
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
 * Converte il valore di `--with` (lista separata da virgola) nei package opzionali.
 *
 * @param value - es. `settings,profile`
 * @throws ArgvError per nomi sconosciuti
 */
export function parseExtras(value: string): OptionalPackageKey[] {
  const keys = [...new Set(value.split(',').map((v) => v.trim()).filter(Boolean))]
  for (const key of keys) {
    if (!(key in OPTIONAL_PACKAGES)) {
      throw new ArgvError(`Package opzionale sconosciuto: "${key}". Ammessi: ${Object.keys(OPTIONAL_PACKAGES).join(', ')}.`)
    }
  }
  return keys as OptionalPackageKey[]
}

/**
 * Parsing degli argomenti di `pachifq create`.
 *
 * @param argv - argomenti dopo `create`
 * @throws ArgvError per opzioni sconosciute, valori mancanti o argomenti posizionali in più
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
        throw new ArgvError(`${split.flag} non esiste più (l'app è generata dai template del CLI, non clonata): usa --link <path> per la shell locale.`)
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
        if (arg.startsWith('-')) throw new ArgvError(`Opzione sconosciuta: ${arg}. Usa "pachifq create --help".`)
        if (result.projectName !== undefined) throw new ArgvError(`Argomento inatteso: "${arg}" (il nome progetto è già "${result.projectName}").`)
        result.projectName = arg
    }
  }
  return result
}

/**
 * Istruzioni finali per i messaggi di errore del backend (`errors.codes.*`), assenti in una nuova app.
 * Il percorso del backend non è noto (il proxy è un URL, non una cartella): resta il segnaposto `<backend>`.
 */
export function errorMessagesHint(): string[] {
  return [
    '',
    pc.bold('Messaggi di errore del backend (opzionale)'),
    '  La cartella src/i18n/generated è vuota: finché non esporti i messaggi dal backend gli errori usano',
    '  il testo di fallback. Se usi un backend pachifast, dalla cartella dell\'app esegui:',
    '',
    '    pachifast locale export --base-dir <backend> --dest-path src/i18n/generated --namespace errors.codes',
    '',
    '  (aggiungi --check per verificare che i file non siano vecchi; <backend> = cartella del progetto backend)',
  ]
}

/**
 * Stampa l'esito di `--dry-run`: cartella di destinazione, file che verrebbero generati e `package.json`.
 *
 * @param targetDir - cartella di destinazione (assoluta)
 * @param cwd - cartella corrente
 * @param files - percorsi relativi dei file
 * @param packageJson - `package.json` risolto
 */
function printDryRun(targetDir: string, cwd: string, files: string[], packageJson: Record<string, unknown>): void {
  console.log(`\n${pc.bold('Dry run')}: in ${path.relative(cwd, targetDir) || '.'} verrebbero generati ${files.length} file\n`)
  for (const file of files) console.log(`  ${file}`)
  console.log(`\n${pc.bold('package.json')}\n${JSON.stringify(packageJson, null, 2)}\n`)
  clack.outro(pc.yellow('Dry run: nessun file scritto, nessuna installazione.'))
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
  // Niente spinner: generateProject stampa i passi e `pnpm install` scrive sul terminale (stdio inherit).
  clack.log.step(parsed.dryRun ? 'Simulazione (dry-run): nessun file verrà scritto…' : 'Scaffold in corso…')
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
    clack.log.success('Progetto creato.')
  } catch (error) {
    if (error instanceof InstallError) {
      clack.log.warn(`Progetto creato, ma ${error.message}`)
      installed = false
      process.exitCode = 1
    } else {
      clack.log.error(`Scaffold fallito: ${error instanceof GenerateError ? error.message : error instanceof Error ? error.message : String(error)}`)
      process.exitCode = 1
      return
    }
  }

  clack.outro(
    [
      pc.green('✔ Fatto!'),
      '',
      `  cd ${path.relative(cwd, targetDir) || '.'}`,
      installed ? '  pnpm dev' : '  pnpm install && pnpm dev',
      prompted.proxyTarget
        ? ''
        : pc.yellow('\n⚠ Proxy backend non impostato: usa http://localhost:8000. Per cambiarlo imposta QCLI_PROXY_TARGET in src/.env.'),
      ...errorMessagesHint(),
    ]
      .filter(Boolean)
      .join('\n'),
  )
}
