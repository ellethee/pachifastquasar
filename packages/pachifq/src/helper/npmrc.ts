/** Esito di {@link mergeNpmrc}. */
export interface NpmrcMerge {
  /** Nuovo contenuto, oppure `null` se il file va rimosso/non scritto. */
  content: string | null
  /** `created` (nuovo), `updated` (modificato un file esistente), `removed` (file esistente da togliere), `none`. */
  action: 'created' | 'updated' | 'removed' | 'none'
}

const SCOPE_LINE_RE = /^\s*@ilpachi:registry\s*=/

/**
 * Calcola il `.npmrc` del progetto per lo scope `@ilpachi` senza perdere le righe già presenti.
 *
 * @param existing - contenuto attuale (`undefined` se il file non esiste)
 * @param registry - URL del registry, oppure `undefined` per il registry pubblico (nessuna riga)
 */
export function mergeNpmrc(existing: string | undefined, registry: string | undefined): NpmrcMerge {
  const lines = (existing ?? '').split(/\r?\n/).filter((line) => line.trim() !== '' && !SCOPE_LINE_RE.test(line))
  const hadScope = existing !== undefined && existing.split(/\r?\n/).some((line) => SCOPE_LINE_RE.test(line))
  if (registry) {
    const url = registry.endsWith('/') ? registry : `${registry}/`
    return {
      content: [...lines, `@ilpachi:registry=${url}`].join('\n') + '\n',
      action: existing === undefined ? 'created' : 'updated',
    }
  }
  if (existing === undefined || !hadScope) return { content: existing ?? null, action: 'none' }
  return lines.length === 0 ? { content: null, action: 'removed' } : { content: lines.join('\n') + '\n', action: 'updated' }
}
