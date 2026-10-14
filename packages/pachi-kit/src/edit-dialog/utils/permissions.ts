/**
 * Converte un testo separato da virgole in lista (trim, senza voci vuote).
 * @param text testo grezzo (es. `"a, b,, c"`)
 * @returns lista di voci
 */
export function parseList(text: string): string[] {
  return text
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
}

/**
 * Converte una lista in testo separato da `, `.
 * @param list lista di voci
 * @returns testo
 */
export function formatList(list: string[]): string {
  return list.join(', ')
}
