/**
 * Formatta un valore per un file `.env` (dotenv di Vite): i newline diventano spazi (i valori sono su una
 * riga), e se contiene spazi iniziali/finali, `#`, apici, `$` o backslash viene racchiuso tra apici.
 *
 * @param value - valore grezzo
 */
export function envValue(value: string): string {
  const single = value.replace(/\r?\n|\r/g, ' ').trim()
  if (single === '') return ''
  if (/^[^\s#"'`$\\=]+(?: [^\s#"'`$\\=]+)*$/.test(single)) return single
  if (!single.includes('"')) return `"${single.replace(/\$/g, '\\$')}"`
  if (!single.includes("'")) return `'${single}'`
  if (!single.includes('`')) return `\`${single}\``
  return `"${single.replace(/"/g, "'").replace(/\$/g, '\\$')}"`
}
