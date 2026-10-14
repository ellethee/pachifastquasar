/** Valore di colonne ammesso da configurazione e `route.meta`: numero di colonne o `grid-template-columns` completo. */
export type PachiDashboardColumns = number | string

/**
 * Converte le colonne della dashboard in un valore CSS `grid-template-columns`.
 * Un numero intero (anche come stringa, es. `'3'`) diventa `repeat(n, 1fr)`; qualunque altra stringa
 * (es. `'repeat(auto-fill, minmax(220px, 1fr))'`) è usata così com'è.
 *
 * @param value - numero di colonne o valore CSS
 * @returns il valore CSS, o `undefined` se assente o non valido (numero < 1)
 */
export function resolveDashboardColumns(value: unknown): string | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1 ? `repeat(${value}, 1fr)` : undefined
  }
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  if (text === '') return undefined
  if (/^\d+$/.test(text)) return resolveDashboardColumns(Number(text))
  return text
}

/**
 * Larghezza massima della dashboard come valore CSS.
 *
 * @param value - lunghezza CSS (es. `'1400px'`, `'90%'`, `'none'`) o numero di pixel
 * @returns il valore CSS, o `undefined` se assente o vuoto
 */
export function resolveDashboardMaxWidth(value: unknown): string | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? `${value}px` : undefined
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text === '' ? undefined : /^\d+(\.\d+)?$/.test(text) ? `${text}px` : text
}
