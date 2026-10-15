/** Activity recorded by the backend (`activity` event and `snapshot` entries). Keys in camelCase. */
export interface ActivityLogEntry {
  id?: number
  timestamp?: string
  userId: string | null
  username: string | null
  method: string
  path: string
  statusCode: number
  durationMs?: number | null
  description: string | null
}

/** Data of the `login` event. */
export interface LoginEventData {
  userId: string
  username: string
}

/** Data of the `logout` event (same schema as `login`). */
export interface LogoutEventData {
  userId: string
  username: string
}
