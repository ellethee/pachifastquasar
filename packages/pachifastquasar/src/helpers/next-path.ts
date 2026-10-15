/** True if the string contains control characters (U+0000-U+001F, U+007F). */
function hasControlChars(value: string): boolean {
  return [...value].some(char => {
    const code = char.charCodeAt(0)
    return code <= 0x1f || code === 0x7f
  })
}

/**
 * Validates the login `?next=` parameter: accepts only paths internal to the app (starting with `/`,
 * not with `//` or `/\`, without `://` or control characters) to avoid open redirects.
 *
 * @param next - raw query value (string, array or other)
 * @param fallback - path to use if `next` is not valid
 * @returns the safe path or `fallback`
 */
export function safeNextPath(next: unknown, fallback: string): string {
  if (typeof next !== 'string' || !next) return fallback
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  if (next.includes('://') || hasControlChars(next)) return fallback
  return next
}
