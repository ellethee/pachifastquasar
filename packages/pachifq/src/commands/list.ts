import pc from 'picocolors'
import { assertPachiProject, listFeatures, NotAPachiProjectError } from '../project-context.js'
import { formatFeatureLines } from '../helper/features-format.js'

const HELP = `
${pc.bold('pachifq list')} - Elenca le feature presenti in src/features

${pc.bold('Usage')}
  $ pachifq list [--json]

${pc.bold('Options')}
  --json       Output leggibile da macchina (array JSON di { name, hasRoutes, title? })
  -h, --help   Mostra questo aiuto
`

/**
 * Comando `pachifq list`: elenca le feature in `src/features`.
 *
 * @param argv - argomenti dopo il nome del comando
 */
export async function run(argv: string[]): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP)
    return
  }
  const json = argv.includes('--json')

  let ctx
  try {
    ctx = assertPachiProject(process.cwd())
  } catch (error) {
    if (error instanceof NotAPachiProjectError) {
      console.error(error.message)
      process.exitCode = 1
      return
    }
    throw error
  }

  const features = listFeatures(ctx.featuresDir)
  if (json) {
    console.log(JSON.stringify(features, null, 2))
    return
  }
  if (features.length === 0) {
    console.log('Nessuna feature trovata in src/features/.\nUsa "pachifq new feature <nome>" per crearne una.')
    return
  }
  console.log([`Feature in src/features/ (${features.length})`, ...formatFeatureLines(features)].join('\n'))
}
