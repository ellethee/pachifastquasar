/**
 * Helpers of the cookie refresh mode (`auth.refreshMode: 'cookie'`): request header, cross-tab lock
 * and BroadcastChannel. Nothing secret ever goes through them.
 */

/**
 * Header required by the backend on `/refresh-token` and `/logout` in cookie mode (CSRF guard:
 * a cross-site form cannot set it). Without it pachifast answers 403 `auth.csrf_rejected`.
 */
export const PACHI_AUTH_REFRESH_HEADER = 'X-Pachi-Auth'
/** Value of {@link PACHI_AUTH_REFRESH_HEADER}. */
export const PACHI_AUTH_REFRESH_HEADER_VALUE = 'refresh'
/** Name of the Web Lock that serializes the refreshes of all the tabs. */
export const PACHI_AUTH_LOCK = 'pachi-auth-refresh'
/** Name of the BroadcastChannel shared by the tabs. */
export const PACHI_AUTH_CHANNEL = 'pachi-auth'

/** Messages exchanged between tabs: never a token. */
export type PachiAuthTabMessage =
  | { type: 'login' }
  | { type: 'logout' }
  | { type: 'refreshed'; expires_at: number | null }

/**
 * Runs `fn` inside the `pachi-auth-refresh` Web Lock, so that two tabs never rotate the
 * single-use refresh cookie at the same time; without `navigator.locks` it runs `fn` directly.
 *
 * @param fn - the refresh
 * @returns the result of `fn`
 */
export function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  return locks ? locks.request(PACHI_AUTH_LOCK, fn) : fn()
}

/**
 * Opens the `pachi-auth` BroadcastChannel.
 *
 * @param onMessage - receives the messages of the other tabs
 * @returns the channel, or `null` if BroadcastChannel is not available
 */
export function openAuthChannel(
  onMessage: (message: PachiAuthTabMessage) => void
): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  const channel = new BroadcastChannel(PACHI_AUTH_CHANNEL)
  channel.onmessage = (event: MessageEvent) => {
    const data = event.data as Partial<PachiAuthTabMessage> | null
    if (data && typeof data.type === 'string') onMessage(data as PachiAuthTabMessage)
  }
  return channel
}
