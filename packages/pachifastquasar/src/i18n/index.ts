import { collectLocales, deepMerge } from '@ilpachi/pachi-i18n'
import type { PachiMessageMap } from '@ilpachi/pachi-i18n'
import it from './locales/it'
import en from './locales/en'

/**
 * Messaggi della shell per lingua (`it` riferimento, `en`): namespace `app`, `auth`, `menu`,
 * `dashboard`, `errors`, `common`. Sono la base su cui {@link composePachiMessages} sovrappone i messaggi dell'app.
 */
export const pachiShellMessages: PachiMessageMap = { it, en }

/** Schema di riferimento dei messaggi della shell (= lingua italiana). */
export type MessageSchema = typeof it

/** Livelli di messaggi forniti dall'app: ognuno è il risultato di `import.meta.glob(..., { eager: true, import: 'default' })`. */
export interface PachiMessageLayers {
  /** `src/i18n/generated/*.json`: generati dal backend (es. `errors.codes`), non modificare a mano. */
  generated?: Record<string, unknown>
  /** `src/i18n/overrides/*.{ts,json}`: personalizzazioni dei testi generati o della shell. */
  overrides?: Record<string, unknown>
  /** `src/i18n/locales/*.ts`: messaggi dell'app. */
  locales?: Record<string, unknown>
  /** `src/features/** /locales/*.ts`: messaggi delle feature. */
  features?: Record<string, unknown>
  /** Lingue di base (default {@link pachiShellMessages}). */
  base?: PachiMessageMap
}

/**
 * Compone i messaggi finali per lingua. Precedenza crescente (a parità di chiave vince il successivo,
 * merge profondo): shell < generated < overrides < locales dell'app < feature. Il codice lingua è il nome
 * del file (`it.ts`, `pt-BR.json`); aggiungere una lingua = aggiungere i file `<codice>.ts`.
 *
 * @param layers - risultati dei glob dell'app (vedi {@link PachiMessageLayers})
 * @returns `{ codiceLingua: messaggi }` da passare a `createPachiApp({ messages })`
 */
export function composePachiMessages(layers: PachiMessageLayers = {}): PachiMessageMap {
  const base = layers.base ?? pachiShellMessages
  const app = collectLocales({
    ...layers.generated,
    ...layers.overrides,
    ...layers.locales,
    ...layers.features
  })
  const result: PachiMessageMap = { ...base }
  for (const [code, messages] of Object.entries(app)) {
    result[code] = deepMerge(result[code] ?? {}, messages)
  }
  return result
}
