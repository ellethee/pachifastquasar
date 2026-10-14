/** Voce di attività recente restituita dall'endpoint delle attività. */
export interface IDashboardActivity {
  timestamp: string
  user_id?: number
  method: string
  status_code: number
  username?: string
  id: number
  path: string
  duration_ms: number
  description?: string
}

/** Informazioni di sistema restituite dall'endpoint di stato. */
export interface IDashboardSystemInfo {
  version?: string
  environment?: string
  status: 'ok' | 'warn' | 'error'
  uptime?: string
}
