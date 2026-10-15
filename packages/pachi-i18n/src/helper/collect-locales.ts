import type { PachiMessageMap } from '../types'
import { deepMerge } from './messages'

/**
 * Converts the result of `import.meta.glob('./locales/*.ts', { eager: true, import: 'default' })` into
 * `{ code: messages }`, deriving the code from the file name (`it.ts`/`it.json` -> `it`, `pt-BR.ts` -> `pt-BR`).
 * Files with the same code (e.g. from different features) are combined with a deep merge.
 *
 * @param globResult - result of `import.meta.glob` (values = messages or modules with `default`)
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
