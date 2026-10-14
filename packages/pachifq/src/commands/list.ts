import pc from 'picocolors'
import { assertPachiProject, listFeatures, NotAPachiProjectError } from '../project-context.js'
import { formatFeatureLines } from '../helper/features-format.js'

const HELP = `
${pc.bold('pachifq list')} - List the features present in src/features

${pc.bold('Usage')}
  $ pachifq list [--json]

${pc.bold('Options')}
  --json       Machine-readable output (JSON array of { name, hasRoutes, title? })
  -h, --help   Show this help
`

/**
 * `pachifq list` command: lists the features in `src/features`.
 *
 * @param argv - arguments after the command name
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
    console.log('No features found in src/features/.\nUse "pachifq new feature <name>" to create one.')
    return
  }
  console.log([`Features in src/features/ (${features.length})`, ...formatFeatureLines(features)].join('\n'))
}
