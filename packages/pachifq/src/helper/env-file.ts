/**
 * Formats a value for an `.env` file (Vite dotenv): newlines become spaces (values are on a single
 * line), and if it contains leading/trailing spaces, `#`, quotes, `$` or backslashes it is wrapped in quotes.
 *
 * @param value - raw value
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
