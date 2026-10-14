import type { IOrderState } from '../types/pachitable2'

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'accent'
})
/**
 * Ordina una copia dell'array secondo piu' colonne (confronto numerico/accent-sensitive).
 *
 * @param items - elementi da ordinare
 * @param sortState - colonne e direzioni, in ordine di priorita'
 * @param nullsLast - true (tutte le colonne) o elenco di colonne i cui valori null/undefined vanno in fondo
 * @returns nuovo array ordinato
 */
export function multiSort<T>(items: T[], sortState: IOrderState[], nullsLast: boolean | string[] = false): T[] {
  return [...items].sort((a, b) => {
    for (const { column, direction } of sortState) {
      const aValue = a[column as keyof T]
      const bValue = b[column as keyof T]

      const applyNullsLast = nullsLast === true || (Array.isArray(nullsLast) && nullsLast.includes(column))
      if (applyNullsLast) {
        const aNull = aValue == null
        const bNull = bValue == null
        if (aNull && bNull) continue
        if (aNull) return 1
        if (bNull) return -1
      }

      const comparison = collator.compare(String(aValue), String(bValue))
      if (comparison < 0) return direction === 'asc' ? -1 : 1
      if (comparison > 0) return direction === 'asc' ? 1 : -1
    }
    return 0
  })
}
