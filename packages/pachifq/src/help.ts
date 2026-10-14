import pc from 'picocolors'

export const GLOBAL_HELP = `
${pc.bold('pachifq')} - scaffolding CLI for apps and features of @ilpachi/pachifastquasar

${pc.bold('Example usage')}
  $ pachifq create project-name
  $ pachifq new feature feature-name
  $ pachifq new f feature-name --title "Title" --icon mdiViewGridOutline
  $ pachifq new locale fr
  $ pachifq list [--json]
  $ pachifq info [--json]

${pc.bold('Help for a command')}
  $ pachifq <command> -h

${pc.bold('Options')}
  -h, --help        Show this help
  -v, --version     Show the installed version
      --no-color    Disable colors in the output

${pc.bold('Commands')}
  create [c]        Generate a new app that depends on @ilpachi/pachifastquasar
  new [n]           Generate new elements (feature, locale; page/component/store in the future)
  info [i]          Show diagnostic information about the current project
  list              List the features already present in src/features
  help [h]          Show this help
`
