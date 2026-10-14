import type { PachiMessageMap } from '../types'
import { deepMerge } from './messages'

/**
 * Converte il risultato di `import.meta.glob('./locales/*.ts', { eager: true, import: 'default' })` in
 * `{ codice: messaggi }`, ricavando il codice dal nome del file (`it.ts`/`it.json` -> `it`, `pt-BR.ts` -> `pt-BR`).
 * File con lo stesso codice (es. di feature diverse) vengono uniti con merge profondo.
 *
 * @param globResult - risultato di `import.meta.glob` (valori = messaggi oppure moduli con `default`)
 */
export function collectLocales(globResult: Record<string, unknown>): PachiMessageMap {
  const result: PachiMessageMap = {}
  for (const [file, mod] of Object.entries(globResult)) {
    const code = (file.split('/').pop() ?? file).replace(/\.([cm]?[jt]s|json)$/, '')
    const raw = mod && typeof mod === 'object' && 'default' in mod ? (mod as { default: unknown }).default : mod
    if (!code || !raw || typeof raw !== 'object') continue
    result[code] = deepMerge(result[code] ?? {}, raw as Record<string, unknown>)
  }
  return result
}
