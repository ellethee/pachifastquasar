import path from 'node:path'
import * as clack from '@clack/prompts'
import pc from 'picocolors'
import { ArgvCursor, ArgvError, parseOrder, splitFlag } from '../../helper/argv.js'
import { assertPachiProject, NotAPachiProjectError } from '../../project-context.js'
import { loadMdiIconNames } from '../../helper/mdi-icons.js'
import { generateFeature, GenerateFeatureError, validateChildren, validateFeatureName, validateIcon, validateTitle } from '../../generate-feature.js'

export const HELP = `
${pc.bold('pachifq new feature')} - Genera una nuova feature in src/features/<nome>

${pc.bold('Usage')}
  $ pachifq new feature <nome> [opzioni]
  $ pachifq new f <nome> [opzioni]

${pc.bold('Examples')}
  $ pachifq new feature invoices
  $ pachifq new f invoices --title "Fatture" --description "Gestione fatture" --icon mdiFileDocumentOutline --order 10 --yes
  $ pachifq new f invoices --title "Fatture" --children billing,reports --yes

${pc.bold('Options')}
  --title <string>          Titolo mostrato in dashboard/menu
  --description <string>   Descrizione della feature
  --icon <string>           Nome export icona da @quasar/extras/mdi-v7 (es. mdiFileDocumentOutline),
                            verificato contro l'elenco reale; se omessa si usa il default
  --order <number>          Ordine nella dashboard (default: 99)
  --children <lista>        Rotte figlie in kebab-case separate da virgola (es. billing,reports).
                            Se presenti, la feature diventa una sezione con una card per figlio,
                            ognuno con una pagina vuota di default (nessuna pagina indice unica).
  --yes                     Salta i prompt, richiede --title (oltre al nome posizionale)
  -h, --help                Mostra questo aiuto
`

/** Argomenti di `pachifq new feature` dopo il parsing. */
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
 * Parsing degli argomenti di `pachifq new feature`.
 *
 * @param argv - argomenti dopo `feature`
 * @throws ArgvError per opzioni sconosciute, valori mancanti/non validi o argomenti posizionali in più
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
        if (arg.startsWith('-')) throw new ArgvError(`Opzione sconosciuta: ${arg}. Usa "pachifq new feature --help".`)
        if (result.name !== undefined) throw new ArgvError(`Argomento inatteso: "${arg}" (la feature è già "${result.name}").`)
        result.name = arg
    }
  }
  return result
}

function parseChildren(value: string | undefined): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : []
}

function exitCancelled(): never {
  clack.cancel('Scaffold annullato.')
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
    clack.log.warn('@quasar/extras/mdi-v7 non risolvibile: validazione dell\'icona solo sintattica.')
  }

  let name: string
  let title: string
  let description: string
  let icon: string | undefined
  let order: number | undefined
  let children: string[]

  if (parsed.yes) {
    if (!parsed.name || !parsed.title) {
      clack.log.error('Con --yes servono almeno il nome posizionale e --title.')
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
        message: 'Nome feature (kebab-case, es. invoices)',
        placeholder: 'invoices',
        validate: (value) => {
          if (!value || !value.trim()) return 'Il nome non può essere vuoto'
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
      message: 'Titolo (mostrato in dashboard/menu)',
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
      message: 'Descrizione',
      initialValue: parsed.description ?? '',
    })
    if (clack.isCancel(descriptionResult)) exitCancelled()
    description = descriptionResult

    const iconResult = await clack.text({
      message: 'Icona (nome export da @quasar/extras/mdi-v7, lascia vuoto per il default)',
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
      message: 'Ordine nella dashboard (default 99)',
      initialValue: parsed.order !== undefined ? String(parsed.order) : '',
      validate: (value) => (value === '' || !Number.isNaN(Number(value)) ? undefined : 'Deve essere un numero'),
    })
    if (clack.isCancel(orderResult)) exitCancelled()
    order = orderResult ? Number(orderResult) : undefined

    const childrenResult = await clack.text({
      message: 'Rotte figlie in kebab-case, separate da virgola (vuoto per nessuna, es. billing,reports)',
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
  spinner.start('Scaffold in corso…')
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
    spinner.stop('Feature creata.')
  } catch (error) {
    spinner.stop('Scaffold fallito.')
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
      pc.green(`✔ Feature "${name}" creata in ${path.relative(process.cwd(), result.featureDir)}/`),
      ...relFiles.map((f) => `  - ${f}`),
      '',
      'Prossimo passo:',
      '  pnpm dev',
      `  apri http://localhost:9001/${name}`,
    ].join('\n'),
  )
}
