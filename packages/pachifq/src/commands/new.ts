import pc from 'picocolors'

type CommandModule = { run: (argv: string[]) => Promise<void> }

const subcommands: Record<string, () => Promise<CommandModule>> = {
  feature: () => import('./new/feature.js'),
  f: () => import('./new/feature.js'),
  locale: () => import('./new/locale.js'),
  l: () => import('./new/locale.js'),
}

const HELP = `
${pc.bold('pachifq new')} - Generate new elements in the project

${pc.bold('Usage')}
  $ pachifq new <type> [name] [options]

${pc.bold('Types')}
  feature [f]       Generate a new feature in src/features/<name>
  locale [l]        Add a language (app and features)

${pc.bold('Examples')}
  $ pachifq new feature invoices
  $ pachifq new f invoices --title "Invoices" --yes
  $ pachifq new locale fr

${pc.bold('Options')}
  -h, --help        Show this help
`

export async function run(argv: string[]): Promise<void> {
  const [sub, ...rest] = argv

  if (!sub || sub === '--help' || sub === '-h') {
    console.log(HELP)
    return
  }

  const loadSub = subcommands[sub]
  if (!loadSub) {
    console.error(`Unknown type: "${sub}". Run "pachifq new --help" for the list.`)
    process.exitCode = 1
    return
  }

  const command = await loadSub()
  await command.run(rest)
}
