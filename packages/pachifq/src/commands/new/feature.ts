import path from 'node:path'
import * as clack from '@clack/prompts'
import pc from 'picocolors'
import { ArgvCursor, ArgvError, parseOrder, splitFlag } from '../../helper/argv.js'
import { assertPachiProject, NotAPachiProjectError } from '../../project-context.js'
import { loadMdiIconNames } from '../../helper/mdi-icons.js'
import { generateFeature, GenerateFeatureError, validateChildren, validateFeatureName, validateIcon, validateTitle } from '../../generate-feature.js'

export const HELP = `
${pc.bold('pachifq new feature')} - Generate a new feature in src/features/<name>

${pc.bold('Usage')}
  $ pachifq new feature <name> [options]
  $ pachifq new f <name> [options]

${pc.bold('Examples')}
  $ pachifq new feature invoices
  $ pachifq new f invoices --title "Invoices" --description "Invoice management" --icon mdiFileDocumentOutline --order 10 --yes
  $ pachifq new f invoices --title "Invoices" --children billing,reports --yes

${pc.bold('Options')}
  --title <string>          Title shown in the dashboard/menu
  --description <string>    Description of the feature
  --icon <string>           Icon export name from @quasar/extras/mdi-v7 (e.g. mdiFileDocumentOutline),
                            checked against the real list; if omitted the default is used
  --order <number>          Order in the dashboard (default: 99)
  --children <list>        Child routes in kebab-case, comma-separated (e.g. billing,reports).
                            If present, the feature becomes a section with one card per child,
                            each with an empty default page (no single index page).
  --yes                     Skip the prompts, requires --title (besides the positional name)
  -h, --help                Show this help
`

/** Arguments of `pachifq new feature` after parsing. */
export interface ParsedArgv {
  name?: string
  title?: string
  description?: string
  icon?: string
  order?: number
  children?: string
  yes: boolean
  help: boolean
}

/**
 * Parses the arguments of `pachifq new feature`.
 *
 * @param argv - arguments after `feature`
 * @throws ArgvError for unknown options, missing/invalid values or extra positional arguments
 */
export function parseArgv(argv: string[]): ParsedArgv {
  const result: ParsedArgv = { yes: false, help: false }
  const cursor = new ArgvCursor(argv)
  while (cursor.hasNext) {
    const arg = cursor.next()
    const split = splitFlag(arg)
    switch (split.flag) {
      case '--title':
        result.title = cursor.value(split)
        break
      case '--description':
        result.description = cursor.value(split)
        break
      case '--icon':
        result.icon = cursor.value(split)
        break
      case '--order':
        result.order = parseOrder(cursor.value(split))
        break
      case '--children':
        result.children = cursor.value(split)
        break
      case '--yes':
        result.yes = true
        break
      case '--no-color':
        break
      case '-h':
      case '--help':
        result.help = true
        break
      default:
        if (arg.startsWith('-')) throw new ArgvError(`Unknown option: ${arg}. Run "pachifq new feature --help".`)
        if (result.name !== undefined) throw new ArgvError(`Unexpected argument: "${arg}" (the feature is already "${result.name}").`)
        result.name = arg
    }
  }
  return result
}

function parseChildren(value: string | undefined): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : []
}

function exitCancelled(): never {
  clack.cancel('Scaffolding cancelled.')
  process.exit(0)
}

export async function run(argv: string[]): Promise<void> {
  let parsed: ParsedArgv
  try {
    parsed = parseArgv(argv)
  } catch (error) {
    if (error instanceof ArgvError) {
      clack.log.error(error.message)
      process.exitCode = 1
      return
    }
    throw error
  }

  if (parsed.help) {
    console.log(HELP)
    return
  }

  let ctx
  try {
    ctx = assertPachiProject(process.cwd())
  } catch (error) {
    if (error instanceof NotAPachiProjectError) {
      clack.log.error(error.message)
      process.exitCode = 1
      return
    }
    throw error
  }

  const iconNames = loadMdiIconNames(ctx.cwd)
  let iconWarned = false
  const warnNoIcons = (): void => {
    if (iconNames || iconWarned) return
    iconWarned = true
    clack.log.warn('@quasar/extras/mdi-v7 cannot be resolved: icon validation is syntactic only.')
  }

  let name: string
  let title: string
  let description: string
  let icon: string | undefined
  let order: number | undefined
  let children: string[]

  if (parsed.yes) {
    if (!parsed.name || !parsed.title) {
      clack.log.error('With --yes at least the positional name and --title are required.')
      process.exitCode = 1
      return
    }
    name = parsed.name
    title = parsed.title
    description = parsed.description ?? ''
    icon = parsed.icon
    order = parsed.order
    children = parseChildren(parsed.children)
    try {
      validateFeatureName(name)
      validateTitle(title)
      if (icon !== undefined) {
        warnNoIcons()
        validateIcon(icon, iconNames)
      }
      validateChildren(children)
    } catch (error) {
      clack.log.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
      return
    }
  } else {
    clack.intro('pachifq new feature')

    if (parsed.name) {
      name = parsed.name
    } else {
      const result = await clack.text({
        message: 'Feature name (kebab-case, e.g. invoices)',
        placeholder: 'invoices',
        validate: (value) => {
          if (!value || !value.trim()) return 'The name cannot be empty'
          try {
            validateFeatureName(value.trim())
          } catch (error) {
            return error instanceof Error ? error.message : String(error)
          }
          return undefined
        },
      })
      if (clack.isCancel(result)) exitCancelled()
      name = result.trim()
    }

    const titleResult = await clack.text({
      message: 'Title (shown in the dashboard/menu)',
      initialValue: parsed.title ?? '',
      validate: (value) => {
        try {
          validateTitle(value ?? '')
        } catch (error) {
          return error instanceof Error ? error.message : String(error)
        }
        return undefined
      },
    })
    if (clack.isCancel(titleResult)) exitCancelled()
    title = titleResult

    const descriptionResult = await clack.text({
      message: 'Description',
      initialValue: parsed.description ?? '',
    })
    if (clack.isCancel(descriptionResult)) exitCancelled()
    description = descriptionResult

    const iconResult = await clack.text({
      message: 'Icon (export name from @quasar/extras/mdi-v7, leave empty for the default)',
      placeholder: 'mdiViewGridOutline',
      initialValue: parsed.icon ?? '',
      validate: (value) => {
        try {
          if (value && value.trim()) {
            warnNoIcons()
            validateIcon(value.trim(), iconNames)
          }
        } catch (error) {
          return error instanceof Error ? error.message : String(error)
        }
        return undefined
      },
    })
    if (clack.isCancel(iconResult)) exitCancelled()
    icon = iconResult.trim() || undefined

    const orderResult = await clack.text({
      message: 'Order in the dashboard (default 99)',
      initialValue: parsed.order !== undefined ? String(parsed.order) : '',
      validate: (value) => (value === '' || !Number.isNaN(Number(value)) ? undefined : 'Must be a number'),
    })
    if (clack.isCancel(orderResult)) exitCancelled()
    order = orderResult ? Number(orderResult) : undefined

    const childrenResult = await clack.text({
      message: 'Child routes in kebab-case, comma-separated (empty for none, e.g. billing,reports)',
      initialValue: parsed.children ?? '',
      validate: (value) => {
        try {
          validateChildren(parseChildren(value))
        } catch (error) {
          return error instanceof Error ? error.message : String(error)
        }
        return undefined
      },
    })
    if (clack.isCancel(childrenResult)) exitCancelled()
    children = parseChildren(childrenResult)
  }

  const spinner = clack.spinner()
  spinner.start('Scaffolding…')
  let result
  try {
    result = await generateFeature({
      featuresDir: ctx.featuresDir,
      name,
      title,
      description,
      ...(icon !== undefined && { icon, iconNames }),
      ...(order !== undefined && { order }),
      children,
    })
    spinner.stop('Feature created.')
  } catch (error) {
    spinner.stop('Scaffolding failed.')
    if (error instanceof GenerateFeatureError) {
      clack.log.error(error.message)
    } else {
      clack.log.error(error instanceof Error ? error.message : String(error))
    }
    process.exitCode = 1
    return
  }

  const relFiles = result.files.map((f) => path.relative(process.cwd(), f))
  clack.outro(
    [
      pc.green(`✔ Feature "${name}" created in ${path.relative(process.cwd(), result.featureDir)}/`),
      ...relFiles.map((f) => `  - ${f}`),
      '',
      'Next step:',
      '  pnpm dev',
      `  open http://localhost:9001/${name}`,
    ].join('\n'),
  )
}
