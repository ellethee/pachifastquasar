/** Recent activity entry returned by the activity endpoint. */
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

/** System information returned by the status endpoint. */
export interface IDashboardSystemInfo {
  version?: string
  environment?: string
  status: 'ok' | 'warn' | 'error'
  uptime?: string
}
