/** Supported densities: `comf` (comfortable, default) and `compact` (value read by default styles and shell). */
export type SettingsDensity = 'comf' | 'compact'

/** `<html>` attribute that default styles and shell react to (`:root[data-density='compact']`). */
export const DENSITY_ATTRIBUTE = 'data-density'

/**
 * Normalizes a density read from `localStorage`. Earlier versions stored `comp`,
 * which now maps to `compact`; any other value (or none) becomes `comf`.
 *
 * @param value - stored value
 * @returns `compact` for `comp`/`compact`, otherwise `comf`
 */
export function normalizeDensity(value: string | null | undefined): SettingsDensity {
  return value === 'comp' || value === 'compact' ? 'compact' : 'comf'
}
