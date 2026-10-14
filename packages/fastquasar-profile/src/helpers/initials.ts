import type { IPachiProfileUser } from '../types/profile'

/**
 * Iniziali (maiuscole) dell'utente: nome + cognome, altrimenti la prima lettera dello username.
 *
 * @param user - utente (anche assente: restituisce stringa vuota)
 * @returns iniziali
 */
export function getInitials(user: IPachiProfileUser | null | undefined): string {
  if (!user) return ''
  const fromName = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`
  return (fromName || user.username?.[0] || '').toUpperCase()
}
