import pc from 'picocolors'

type CommandModule = { run: (argv: string[]) => Promise<void> }

const subcommands: Record<string, () => Promise<CommandModule>> = {
  feature: () => import('./new/feature.js'),
  f: () => import('./new/feature.js'),
  locale: () => import('./new/locale.js'),
  l: () => import('./new/locale.js'),
}

const HELP = `
${pc.bold('pachifq new')} - Genera nuovi elementi nel progetto

${pc.bold('Usage')}
  $ pachifq new <tipo> [nome] [opzioni]

${pc.bold('Types')}
  feature [f]       Genera una nuova feature in src/features/<nome>
  locale [l]        Aggiunge una lingua (app e feature)

${pc.bold('Examples')}
  $ pachifq new feature invoices
  $ pachifq new f invoices --title "Fatture" --yes
  $ pachifq new locale fr

${pc.bold('Options')}
  -h, --help        Mostra questo aiuto
`

export async function run(argv: string[]): Promise<void> {
  const [sub, ...rest] = argv

  if (!sub || sub === '--help' || sub === '-h') {
    console.log(HELP)
    return
  }

  const loadSub = subcommands[sub]
  if (!loadSub) {
    console.error(`Tipo sconosciuto: "${sub}". Usa "pachifq new --help" per l'elenco.`)
    process.exitCode = 1
    return
  }

  const command = await loadSub()
  await command.run(rest)
}
