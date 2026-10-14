import { envValue } from './env-file.js'
import { PACHI_OPTIONS } from './pachi-options.js'
import type { GenerateOptions } from '../generate-project.js'

/**
 * Contenuto di `src/.env.example`: tutte le variabili `QCLI_*` documentate con il default della shell in
 * commento (decommentare solo ciò che si vuole cambiare: ogni variabile impostata sovrascrive la base di
 * `definePachiConfig`).
 */
export function buildEnvExample(): string {
  return (
    '# Opzioni dell\'app (precedenza: process.env > src/.env.local > src/.env).\n' +
    '# Ogni variabile impostata (e non vuota) sovrascrive la base di definePachiConfig in src/pachi-config.ts;\n' +
    '# quelle commentate qui mostrano il default della shell.\n' +
    PACHI_OPTIONS.map((o) => `# ${o.key}=${o.defaultValue}\n`).join('')
  )
}

/**
 * Contenuto di `src/.env`: SOLO le variabili scelte dall'utente (titolo, descrizione, lingua fissa,
 * dashboard automatica disattivata, auth disattivata, voci di menu disattivate, proxy); il resto resta ai
 * default della shell e alla base di `src/pachi-config.ts`.
 *
 * @param options - opzioni di generazione
 */
export function buildEnvContent(options: GenerateOptions): string {
  const lines: string[] = []
  if (options.productName) lines.push(`QCLI_APP_TITLE=${envValue(options.productName)}`)
  if (options.description) lines.push(`QCLI_APP_DESCRIPTION=${envValue(options.description)}`)
  if (options.locale) lines.push(`QCLI_APP_LOCALE=${options.locale}`)
  if (!options.autoDashboard) lines.push('QCLI_APP_AUTO_DASHBOARD=false')
  if (!options.envelope) lines.push('QCLI_HTTP_ENVELOPE=false')
  if (!options.authEnabled) lines.push('QCLI_AUTH_ENABLED=false')
  if (!options.authMenu.profile) lines.push('QCLI_AUTH_MENU_PROFILE=false')
  if (!options.authMenu.settings) lines.push('QCLI_AUTH_MENU_SETTINGS=false')
  if (!options.authMenu.home) lines.push('QCLI_AUTH_MENU_HOME=false')
  if (options.proxyTarget) lines.push(`QCLI_PROXY_TARGET=${envValue(options.proxyTarget)}`)
  return (
    '# Solo le opzioni scelte alla creazione. Le altre (vedi .env.example) usano i default della shell\n' +
    '# o la base di src/pachi-config.ts.\n' +
    lines.map((l) => `${l}\n`).join('')
  )
}
