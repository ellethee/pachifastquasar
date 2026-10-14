/**
 * Indica se un URL è relativo o punta alla stessa origine dell'app (sicuro per inviare credenziali).
 *
 * @param url - URL relativo o assoluto
 * @param base - origine di riferimento (default: `window.location.href`)
 * @returns true se same-origin
 */
export function isSameOrigin(url: string, base: string = window.location.href): boolean {
  try {
    return new URL(url, base).origin === new URL(base).origin
  } catch {
    return false
  }
}
