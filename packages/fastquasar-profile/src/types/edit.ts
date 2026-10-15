import type { IPachiProfileUser } from './profile'

/** Profile editing options (`PATCH /auth/user`). */
export interface IPachiProfileEditOptions {
  /** `false` hides editing even with an options object (default `true`). */
  enabled?: boolean
  /** API base URL (default `/api`). */
  apiBase?: string
  /**
   * Called after saving, with the user returned by the backend: used to update the app's copy,
   * for example `() => authManager.refreshUserInfo()`.
   */
  onUpdated?: (user: IPachiProfileUser) => void | Promise<void>
}
