import { envValue } from './env-file.js'
import { PACHI_OPTIONS } from './pachi-options.js'
import type { GenerateOptions } from '../generate-project.js'

/**
 * Contents of `src/.env.example`: all the `QCLI_*` variables documented with the shell default in a
 * comment (uncomment only what you want to change: every variable that is set overrides the
 * `definePachiConfig` base).
 */
export function buildEnvExample(): string {
  return (
    '# App options (precedence: process.env > src/.env.local > src/.env).\n' +
    '# Every variable that is set (and non-empty) overrides the definePachiConfig base in src/pachi-config.ts;\n' +
    '# the ones commented out here show the shell default.\n' +
    PACHI_OPTIONS.map((o) => `# ${o.key}=${o.defaultValue}\n`).join('')
  )
}

/**
 * Contents of `src/.env`: ONLY the variables chosen by the user (title, description, fixed language,
 * automatic dashboard disabled, auth disabled, menu entries disabled, proxy); the rest is left to the
 * shell defaults and the `src/pachi-config.ts` base.
 *
 * @param options - generation options
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
    '# Only the options chosen at creation. The others (see .env.example) use the shell defaults\n' +
    '# or the src/pachi-config.ts base.\n' +
    lines.map((l) => `${l}\n`).join('')
  )
}
