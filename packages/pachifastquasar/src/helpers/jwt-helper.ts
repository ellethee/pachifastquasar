/**
 * Scadenza (`exp`) di un JWT in millisecondi.
 * Il payload è base64url (`-`, `_`, senza padding): `atob` da solo lancerebbe con certi token.
 *
 * @param token - access token JWT
 * @returns la scadenza in ms dall'epoca, o `null` se il token non è un JWT valido o non ha `exp`
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
