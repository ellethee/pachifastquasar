/**
 * Expiry (`exp`) of a JWT in milliseconds.
 * The payload is base64url (`-`, `_`, no padding): `atob` alone would throw with some tokens.
 *
 * @param token - JWT access token
 * @returns the expiry in ms since the epoch, or `null` if the token is not a valid JWT or has no `exp`
 */
export function decodeJwtExpiry(token: string | null | undefined): number | null {
  try {
    const part = token?.split('.')[1]
    if (!part) return null
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { exp?: unknown }
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : null
  } catch {
    return null
  }
}
