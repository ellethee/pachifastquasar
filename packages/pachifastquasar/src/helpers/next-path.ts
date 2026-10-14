/** Vero se la stringa contiene caratteri di controllo (U+0000-U+001F, U+007F). */
function hasControlChars(value: string): boolean {
  return [...value].some(char => {
    const code = char.charCodeAt(0)
    return code <= 0x1f || code === 0x7f
  })
}

/**
 * Valida il parametro `?next=` del login: accetta solo percorsi interni all'app (iniziano con `/`,
 * non con `//` o `/\`, senza `://` né caratteri di controllo) per evitare open redirect.
 *
 * @param next - valore grezzo della query (stringa, array o altro)
 * @param fallback - percorso da usare se `next` non è valido
 * @returns il percorso sicuro oppure `fallback`
 */
export function safeNextPath(next: unknown, fallback: string): string {
  if (typeof next !== 'string' || !next) return fallback
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  if (next.includes('://') || hasControlChars(next)) return fallback
  return next
}
