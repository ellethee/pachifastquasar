import path from 'node:path'
import pc from 'picocolors'
import { assertPachiProject, NotAPachiProjectError } from '../../project-context.js'
import { addLocale, LocaleError, type LocaleFileResult } from '../../helper/locales.js'

export const HELP = `
${pc.bold('pachifq new locale')} - Aggiunge una lingua al progetto

${pc.bold('Usage')}
  $ pachifq new locale <codice>
  $ pachifq new l <codice>

${pc.bold('Examples')}
  $ pachifq new locale fr
  $ pachifq new locale pt-BR

Crea, partendo da en.ts (stesse chiavi, valori da tradurre, commento TODO):
  - src/i18n/locales/<codice>.ts dell'app (se l'app non ha ancora en.ts/it.ts, un file vuoto da
    riempire con le chiavi della shell che vuoi tradurre: le altre ripiegano su en)
  - src/features/*/locales/<codice>.ts per ogni feature
  - packages/*/src/locales/<codice>.ts per ogni package in packages/ che ha src/locales
    (solo se l'app ha package propri; se packages/ non esiste il passo è saltato)
I package in node_modules (shell compresa) NON vengono modificati: per tradurli aggiungi le chiavi con lo
stesso namespace in src/i18n/locales/<codice>.ts (i messaggi dell'app hanno la precedenza).
I file già esistenti non vengono sovrascritti.

${pc.bold('Options')}
  -h, --help        Mostra questo aiuto
`

/**
 * Comando `pachifq new locale <codice>`.
 *
 * @param argv - argomenti dopo `locale`
 */
export async function run(argv: string[]): Promise<void> {
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(HELP)
    return
  }
  const code = argv.find((arg) => !arg.startsWith('-'))
  if (!code) {
    console.error('Manca il codice lingua. Esempio: pachifq new locale fr')
    process.exitCode = 1
    return
  }

  const cwd = process.cwd()
  try {
    assertPachiProject(cwd)
    const result = await addLocale(cwd, code)
    const line = ({ file, status }: LocaleFileResult): string =>
      status === 'created' ? `  ${pc.green('+')} ${path.relative(cwd, file)}` : `  ${pc.dim('=')} ${path.relative(cwd, file)} (esiste già, non modificato)`
    const all = [result.app, ...result.features, ...result.packages]
    console.log([pc.bold(`Lingua "${code}"`), ...all.map(line)].join('\n'))
    if (result.externalPackages.length > 0) {
      console.log(
        [
          '',
          pc.yellow('Package in node_modules (non modificati):'),
          ...result.externalPackages.map((name) => `  - ${name}`),
          `Per tradurli aggiungi le chiavi con lo stesso namespace in src/i18n/locales/${code}.ts`,
          '(le chiavi sono nel README/CLAUDE.md del package).',
        ].join('\n'),
      )
    }
    console.log(`\nTraduci i valori (cerca "TODO: traduci"); la lingua compare nel selettore dopo il riavvio del dev server.`)
  } catch (error) {
    if (error instanceof NotAPachiProjectError || error instanceof LocaleError) {
      console.error(error.message)
      process.exitCode = 1
      return
    }
    throw error
  }
}
