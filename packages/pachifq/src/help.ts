import pc from 'picocolors'

export const GLOBAL_HELP = `
${pc.bold('pachifq')} - CLI di scaffold app e feature per @ilpachi/pachifastquasar

${pc.bold('Example usage')}
  $ pachifq create nome-progetto
  $ pachifq new feature nome-feature
  $ pachifq new f nome-feature --title "Titolo" --icon mdiViewGridOutline
  $ pachifq new locale fr
  $ pachifq list [--json]
  $ pachifq info [--json]

${pc.bold('Help for a command')}
  $ pachifq <comando> -h

${pc.bold('Options')}
  -h, --help        Mostra questo aiuto
  -v, --version     Mostra la versione installata
      --no-color    Disabilita i colori nell'output

${pc.bold('Commands')}
  create [c]        Genera una nuova app che dipende da @ilpachi/pachifastquasar
  new [n]           Genera nuovi elementi (feature, locale; in futuro page/component/store)
  info [i]          Mostra informazioni diagnostiche sul progetto corrente
  list              Elenca le feature già presenti in src/features
  help [h]          Mostra questo aiuto
`
