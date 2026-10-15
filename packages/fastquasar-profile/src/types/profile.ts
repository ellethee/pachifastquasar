/** User data shown by the profile page. */
export interface IPachiProfileUser {
  id: number | string
  username: string
  email: string | null
  firstName: string
  lastName: string
  isActive?: boolean
  isStaff?: boolean
  isSuperuser?: boolean
  /** Email verification date (ISO 8601 UTC), `null` if not verified. */
  emailVerifiedAt?: string | null
  /** Last login date (ISO 8601 UTC). */
  lastLoginAt?: string | null
  /** Account creation date (ISO 8601 UTC). */
  createdAt?: string | null
  /** User permissions. */
  permissions?: string[]
  /** Additional user data (free-form object, pachifast backend 0.15.0+); no UI uses it. */
  profile?: Record<string, unknown>
}
