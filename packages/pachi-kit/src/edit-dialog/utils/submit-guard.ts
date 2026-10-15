/** Re-entry guard for async actions (save, confirm). */
export interface ISubmitGuard {
  /** `true` if the action is in progress. */
  readonly busy: boolean
  /**
   * Tries to start an action.
   * @returns `false` if one is already in progress (to be ignored), otherwise `true`
   */
  enter: () => boolean
  /** Signals the end of the action (success, error or cancellation). Idempotent. */
  leave: () => void
}

/**
 * Creates a guard that prevents starting the same action twice (double click).
 * If nobody calls `leave()` within `timeoutMs` the guard releases itself, so a listener
 * that never calls `onSuccess`/`onError` does not block the dialog forever.
 * @param timeoutMs maximum lock time in milliseconds (default 10000)
 */
export function createSubmitGuard(timeoutMs = 10_000): ISubmitGuard {
  let busy = false
  let timer: ReturnType<typeof setTimeout> | null = null
  function leave(): void {
    busy = false
    if (timer) clearTimeout(timer)
    timer = null
  }
  function enter(): boolean {
    if (busy) return false
    busy = true
    timer = setTimeout(leave, timeoutMs)
    return true
  }
  return {
    get busy() { return busy },
    enter,
    leave,
  }
}
