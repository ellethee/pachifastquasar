import path from 'node:path'
import pc from 'picocolors'
import { assertPachiProject, NotAPachiProjectError } from '../../project-context.js'
import { addLocale, LocaleError, type LocaleFileResult } from '../../helper/locales.js'

export const HELP = `
${pc.bold('pachifq new locale')} - Adds a language to the project

${pc.bold('Usage')}
  $ pachifq new locale <code>
  $ pachifq new l <code>

${pc.bold('Examples')}
  $ pachifq new locale fr
  $ pachifq new locale pt-BR

Creates, starting from en.ts (same keys, values to translate, TODO comment):
  - the app's src/i18n/locales/<code>.ts (if the app has no en.ts/it.ts yet, an empty file to
    fill with the shell keys you want to translate: the others fall back to en)
  - src/features/*/locales/<code>.ts for each feature
  - packages/*/src/locales/<code>.ts for each package in packages/ that has src/locales
    (only if the app has its own packages; if packages/ does not exist the step is skipped)
Packages in node_modules (shell included) are NOT modified: to translate them add the keys with the
same namespace in src/i18n/locales/<code>.ts (the app's messages take precedence).
Files that already exist are not overwritten.

${pc.bold('Options')}
  -h, --help        Show this help
`

/**
 * `pachifq new locale <code>` command.
 *
 * @param argv - arguments after `locale`
 */
export async function run(argv: string[]): Promise<void> {
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(HELP)
    return
  }
  const code = argv.find((arg) => !arg.startsWith('-'))
  if (!code) {
    console.error('Missing language code. Example: pachifq new locale fr')
    process.exitCode = 1
    return
  }

  const cwd = process.cwd()
  try {
    assertPachiProject(cwd)
    const result = await addLocale(cwd, code)
    const line = ({ file, status }: LocaleFileResult): string =>
      status === 'created' ? `  ${pc.green('+')} ${path.relative(cwd, file)}` : `  ${pc.dim('=')} ${path.relative(cwd, file)} (already exists, not modified)`
    const all = [result.app, ...result.features, ...result.packages]
    console.log([pc.bold(`Language "${code}"`), ...all.map(line)].join('\n'))
    if (result.externalPackages.length > 0) {
      console.log(
        [
          '',
          pc.yellow('Packages in node_modules (not modified):'),
          ...result.externalPackages.map((name) => `  - ${name}`),
          `To translate them add the keys with the same namespace in src/i18n/locales/${code}.ts`,
          '(the keys are in the package README/CLAUDE.md).',
        ].join('\n'),
      )
    }
    console.log(`\nTranslate the values (search for "TODO: translate"); the language appears in the selector after restarting the dev server.`)
  } catch (error) {
    if (error instanceof NotAPachiProjectError || error instanceof LocaleError) {
      console.error(error.message)
      process.exitCode = 1
      return
    }
    throw error
  }
}
