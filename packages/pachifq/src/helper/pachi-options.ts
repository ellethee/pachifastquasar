import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

/** Opzione `QCLI_*` della shell con il suo default (vedi README di `@ilpachi/pachifastquasar`). */
export interface PachiOption {
  key: string
  /** Default della shell quando la variabile non è impostata (`''` = vuoto). */
  defaultValue: string
}

/** Variabili d'ambiente lette da `pachiConfigFromEnv` e dal preset Quasar, con i default della shell. */
export const PACHI_OPTIONS: readonly PachiOption[] = [
  { key: 'QCLI_AUTH_ENABLED', defaultValue: 'true' },
  { key: 'QCLI_AUTH_STORAGE', defaultValue: 'local' },
  { key: 'QCLI_AUTH_MENU_PROFILE', defaultValue: 'true' },
  { key: 'QCLI_AUTH_MENU_SETTINGS', defaultValue: 'true' },
  { key: 'QCLI_AUTH_MENU_HOME', defaultValue: 'true' },
  { key: 'QCLI_APP_TITLE', defaultValue: 'Pachi Fast Quasar' },
  { key: 'QCLI_APP_DESCRIPTION', defaultValue: 'Quasar Vue boilerplate' },
  { key: 'QCLI_APP_SHOW_LOGO', defaultValue: 'true' },
  { key: 'QCLI_APP_LOGO_SIZE', defaultValue: '36px' },
  { key: 'QCLI_APP_LOGO_OVERLAP', defaultValue: 'false' },
  { key: 'QCLI_APP_LOCALE', defaultValue: '' },
  { key: 'QCLI_APP_SHOW_LOCALE_SWITCHER', defaultValue: 'true' },
  { key: 'QCLI_APP_AUTO_DASHBOARD', defaultValue: 'true' },
  { key: 'QCLI_APP_HIDE_HUB_HEADER', defaultValue: 'false' },
  { key: 'QCLI_APP_DASHBOARD_MAX_WIDTH', defaultValue: '1080px' },
  { key: 'QCLI_APP_DASHBOARD_COLUMNS', defaultValue: '3' },
  { key: 'QCLI_APP_TITLE_ANIMATION', defaultValue: 'rubber-band' },
  { key: 'QCLI_APP_HOVER_EFFECTS', defaultValue: 'true' },
  { key: 'QCLI_APP_GRAVATAR', defaultValue: 'false' },
  { key: 'QCLI_HTTP_ENVELOPE', defaultValue: 'true' },
  { key: 'QCLI_PROXY_TARGET', defaultValue: 'http://localhost:8000' },
]

/** File `.env` consultati, in ordine di precedenza: `src/` è l'`envDir` del preset, la root vale per le app vecchie. */
const ENV_FILES = ['src/.env.local', 'src/.env', '.env.local', '.env']

/**
 * Legge una variabile con precedenza `process.env` > `src/.env.local` > `src/.env` > `.env.local` > `.env`.
 *
 * @param cwd - root del progetto
 * @param key - nome variabile
 */
export function readEnvValue(cwd: string, key: string): string | undefined {
  const fromProcess = process.env[key]
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess
  for (const file of ENV_FILES) {
    const filePath = path.join(cwd, file)
    if (!existsSync(filePath)) continue
    const match = readFileSync(filePath, 'utf-8').match(new RegExp(`^${key}=(.*)$`, 'm'))
    if (match?.[1] !== undefined) return match[1].trim().replace(/^["']|["']$/g, '')
  }
  return undefined
}

/**
 * Proxy backend scritto in `quasar.config.ts` (`proxyTarget: process.env.QCLI_PROXY_TARGET ?? '<url>'`).
 *
 * @param cwd - root del progetto
 */
export function readConfiguredProxy(cwd: string): string | undefined {
  const file = path.join(cwd, 'quasar.config.ts')
  if (!existsSync(file)) return undefined
  return readFileSync(file, 'utf-8').match(/proxyTarget:\s*(?:process\.env\.\w+\s*\?\?\s*)?['"]([^'"]+)['"]/)?.[1]
}

/** Valore effettivo di un'opzione e da dove arriva. */
export interface ResolvedOption {
  key: string
  value: string
  /** `true` se impostata (env/file), `false` se è il default della shell. */
  set: boolean
}

/**
 * Valori effettivi delle opzioni `QCLI_*` del progetto (impostate o di default).
 *
 * @param cwd - root del progetto
 */
export function resolvePachiOptions(cwd: string): ResolvedOption[] {
  return PACHI_OPTIONS.map(({ key, defaultValue }) => {
    let value = readEnvValue(cwd, key)
    if (key === 'QCLI_PROXY_TARGET' && value === undefined) value = readConfiguredProxy(cwd)
    return { key, value: value ?? defaultValue, set: value !== undefined }
  })
}
