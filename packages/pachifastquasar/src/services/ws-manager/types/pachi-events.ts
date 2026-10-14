/** Attività registrata dal backend (evento `activity` e voci dello `snapshot`). Chiavi in camelCase. */
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

/** Dati dell'evento `login`. */
export interface LoginEventData {
  userId: string
  username: string
}

/** Dati dell'evento `logout` (stesso schema di `login`). */
export interface LogoutEventData {
  userId: string
  username: string
}
