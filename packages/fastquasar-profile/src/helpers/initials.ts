import type { IPachiProfileUser } from '../types/profile'

/**
 * User initials (uppercase): first name + last name, otherwise the first letter of the username.
 *
 * @param user - user (may be missing: returns an empty string)
 * @returns initials
 */
export function getInitials(user: IPachiProfileUser | null | undefined): string {
  if (!user) return ''
  const fromName = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`
  return (fromName || user.username?.[0] || '').toUpperCase()
}
