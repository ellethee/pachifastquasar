/**
 * Tells whether a URL is relative or points to the same origin as the app (safe to send credentials).
 *
 * @param url - relative or absolute URL
 * @param base - reference origin (default: `window.location.href`)
 * @returns true if same-origin
 */
export function isSameOrigin(url: string, base: string = window.location.href): boolean {
  try {
    return new URL(url, base).origin === new URL(base).origin
  } catch {
    return false
  }
}
