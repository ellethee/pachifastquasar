/** Densità supportate: `comf` (comoda, default) e `compact` (valore letto da stili di default e shell). */
export type SettingsDensity = 'comf' | 'compact'

/** Attributo di `<html>` su cui reagiscono stili di default e shell (`:root[data-density='compact']`). */
export const DENSITY_ATTRIBUTE = 'data-density'

/**
 * Normalizza una densità letta da `localStorage`. Le versioni precedenti salvavano `comp`,
 * che oggi corrisponde a `compact`; qualsiasi altro valore (o assenza) diventa `comf`.
 *
 * @param value - valore salvato
 * @returns `compact` per `comp`/`compact`, altrimenti `comf`
 */
export function normalizeDensity(value: string | null | undefined): SettingsDensity {
  return value === 'comp' || value === 'compact' ? 'compact' : 'comf'
}
