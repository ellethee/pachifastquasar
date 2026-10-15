/**
 * Converts a comma-separated text into a list (trimmed, without empty entries).
 * @param text raw text (e.g. `"a, b,, c"`)
 * @returns list of entries
 */
export function parseList(text: string): string[] {
  return text
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
}

/**
 * Converts a list into text separated by `, `.
 * @param list list of entries
 * @returns text
 */
export function formatList(list: string[]): string {
  return list.join(', ')
}
