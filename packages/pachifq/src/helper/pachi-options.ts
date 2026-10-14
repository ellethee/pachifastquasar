import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

/** `QCLI_*` option of the shell with its default (see the README of `@ilpachi/pachifastquasar`). */
export interface PachiOption {
  key: string
  /** Shell default when the variable is not set (`''` = empty). */
  defaultValue: string
}

/** Environment variables read by `pachiConfigFromEnv` and by the Quasar preset, with the shell defaults. */
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

/** `.env` files consulted, in order of precedence: `src/` is the preset's `envDir`, the root is for old apps. */
const ENV_FILES = ['src/.env.local', 'src/.env', '.env.local', '.env']

/**
 * Reads a variable with precedence `process.env` > `src/.env.local` > `src/.env` > `.env.local` > `.env`.
 *
 * @param cwd - project root
 * @param key - variable name
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
 * Backend proxy written in `quasar.config.ts` (`proxyTarget: process.env.QCLI_PROXY_TARGET ?? '<url>'`).
 *
 * @param cwd - project root
 */
export function readConfiguredProxy(cwd: string): string | undefined {
  const file = path.join(cwd, 'quasar.config.ts')
  if (!existsSync(file)) return undefined
  return readFileSync(file, 'utf-8').match(/proxyTarget:\s*(?:process\.env\.\w+\s*\?\?\s*)?['"]([^'"]+)['"]/)?.[1]
}

/** Effective value of an option and where it comes from. */
export interface ResolvedOption {
  key: string
  value: string
  /** `true` if set (env/file), `false` if it is the shell default. */
  set: boolean
}

/**
 * Effective values of the project's `QCLI_*` options (set or default).
 *
 * @param cwd - project root
 */
export function resolvePachiOptions(cwd: string): ResolvedOption[] {
  return PACHI_OPTIONS.map(({ key, defaultValue }) => {
    let value = readEnvValue(cwd, key)
    if (key === 'QCLI_PROXY_TARGET' && value === undefined) value = readConfiguredProxy(cwd)
    return { key, value: value ?? defaultValue, set: value !== undefined }
  })
}
