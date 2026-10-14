import { GLOBAL_HELP } from './help.js'
import { getVersion } from './version.js'

type CommandModule = { run: (argv: string[]) => Promise<void> }

const commands: Record<string, () => Promise<CommandModule>> = {
  create: () => import('./commands/create.js'),
  c: () => import('./commands/create.js'),
  new: () => import('./commands/new.js'),
  n: () => import('./commands/new.js'),
  info: () => import('./commands/info.js'),
  i: () => import('./commands/info.js'),
  list: () => import('./commands/list.js'),
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2)

  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help' || cmd === 'h') {
    console.log(GLOBAL_HELP)
    return
  }

  if (cmd === '--version' || cmd === '-v') {
    console.log(getVersion())
    return
  }

  const loadCommand = commands[cmd]
  if (!loadCommand) {
    console.error(`Unknown command: "${cmd}". Run "pachifq --help" for the list of commands.`)
    process.exitCode = 1
    return
  }

  const command = await loadCommand()
  await command.run(rest)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
