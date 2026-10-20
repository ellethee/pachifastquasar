import { getUseAlovaInstance, STOP_PROCESSOR } from '@ilpachi/use-alova'
import type { UseAlovaResponseProcessorMap, UseAlovaReturn } from '@ilpachi/use-alova'
import { withFiles } from '@ilpachi/use-alova/files'
import { readPersistedAuth, useAuthStore } from './auth-store'
import type { Router, RouteMeta } from 'vue-router'
import { safeNextPath } from '../../helpers/next-path'
import { decodeJwtExpiry } from '../../helpers/jwt-helper'
import { notifyPachiAuthChanged } from '../../helpers/auth-events'
import { isCookieRefreshMode } from '../../core/config'
import {
  openAuthChannel,
  PACHI_AUTH_REFRESH_HEADER,
  PACHI_AUTH_REFRESH_HEADER_VALUE,
  withRefreshLock
} from './cookie-session'
import type { PachiAuthTabMessage } from './cookie-session'
import type {
  IEngineInfo,
  IMfaRequiredResponse,
  ITokenResponse,
  IUserInfo,
  LoginResult
} from './types/auth-manager'

/**
 * Comparison of the relevant user data (to decide whether to remount the UI after a refresh).
 *
 * @param a - previous data
 * @param b - new data
 * @returns true if the relevant fields match
 */
export function isSameUserInfo(a: IUserInfo | null, b: IUserInfo | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const pick = (u: IUserInfo) =>
    JSON.stringify([
      u.id,
      u.username,
      u.email,
      u.firstName,
      u.lastName,
      u.isActive,
      u.isStaff,
      u.isSuperuser,
      [...(u.permissions ?? [])].sort()
    ])
  return pick(a) === pick(b)
}

/**
 * Extracts the useful body of an auth response: if the backend wrapped the response in the envelope
 * (`{ success, message, data }`, e.g. `/mfa/verify` with the client without `unwrapEnvelope`) returns `data`.
 *
 * @param response - response received from the client
 * @returns the payload without envelope
 */
export function unwrapAuthResponse<T>(response: unknown): T {
  if (response !== null && typeof response === 'object') {
    const r = response as { success?: unknown; data?: unknown }
    if ('success' in r && r.data !== null && typeof r.data === 'object') return r.data as T
  }
  return response as T
}

/**
 * True if the `/auth/token` response asks for the second factor (`{ mfa_required: true, mfa_token }`).
 *
 * @param response - payload already without envelope
 */
export function isMfaRequired(response: unknown): response is IMfaRequiredResponse {
  return (
    response !== null &&
    typeof response === 'object' &&
    (response as { mfa_required?: unknown }).mfa_required === true &&
    typeof (response as { mfa_token?: unknown }).mfa_token === 'string'
  )
}

/**
 * Stable code (`detail[0].code`) of a backend HTTP error, if present.
 *
 * @param error - client error (`ResponseError`) or other
 * @returns the code (e.g. `mfa.code_invalid`) or `undefined`
 */
export async function getErrorCode(error: unknown): Promise<string | undefined> {
  const reader = (error as { safeResponseData?: () => Promise<unknown> } | null)?.safeResponseData
  if (typeof reader !== 'function') return undefined
  try {
    const body = (await reader.call(error)) as { detail?: unknown } | null
    const detail = body?.detail
    if (Array.isArray(detail)) return (detail[0] as { code?: string } | undefined)?.code
  } catch {
    /* unreadable body */
  }
  return undefined
}

/** Codes of `/mfa/verify` after which the ongoing challenge is no longer usable (restart from login). */
const MFA_DEAD_CODES = new Set(['mfa.token_invalid', 'mfa.challenge_not_found', 'mfa.not_configured'])

/** Cookie mode: a refresh done less than this many ms ago (with a valid access token) is reused. */
const REFRESH_DEDUPE_MS = 5_000
/** Cookie mode: wait before retrying a 401 of `/refresh-token` (rotation race with another tab). */
const REFRESH_RACE_RETRY_MS = 300

/** Request options of `/refresh-token` and `/logout` in cookie mode (cookie sent, CSRF header). */
function cookieAuthRequest() {
  return {
    autoError: false,
    showOverlay: false,
    credentials: 'include' as const,
    headers: {
      'Content-Type': 'application/json',
      [PACHI_AUTH_REFRESH_HEADER]: PACHI_AUTH_REFRESH_HEADER_VALUE
    }
  }
}

/** HTTP status of a client error, if any. */
function statusOf(error: unknown): number | undefined {
  return (error as { status?: number } | null)?.status
}

export class AuthManager {
  private static instance: AuthManager
  private static _router: Router | null = null
  private api: ReturnType<typeof withFiles<UseAlovaReturn>>
  private store: ReturnType<typeof useAuthStore>
  private _renewTimer: ReturnType<typeof setTimeout> | null = null
  private _sessionRefreshed = false
  /** Refresh in progress: shared by all callers (single-flight). */
  private _refreshing: Promise<void> | null = null
  /** Logout in progress: shared by all callers. */
  private _loggingOut: Promise<void> | null = null
  /** Consecutive failures of the scheduled refresh (for the retry before logout). */
  private _renewFailures = 0
  /** Token of the ongoing MFA challenge: in memory ONLY (never in storage, never logged). */
  private _mfaToken: string | null = null
  /** Cookie mode: a session was established (login or refresh succeeded) and not logged out. */
  private _sessionActive = false
  /** Bumped at every logout: a refresh started before it must not reinstall the session. */
  private _epoch = 0
  /** Cookie mode: time (epoch ms) of the last successful refresh of this tab. */
  private _lastRefreshAt = 0
  /** Cookie mode: channel to the other tabs (`null` without BroadcastChannel). */
  private _channel: BroadcastChannel | null = null

  private constructor() {
    this.store = useAuthStore()
    this.api = withFiles(getUseAlovaInstance()({ url: '/api/auth' }))
    AuthManager.instance = this
    if (typeof window !== 'undefined') {
      if (isCookieRefreshMode()) {
        // nothing is persisted: the tabs talk through a BroadcastChannel (no tokens on it)
        this._channel = openAuthChannel(message => this._handleTabMessage(message))
      } else {
        // multiple tabs (localStorage): a logout in another tab arrives as a `storage` event
        window.addEventListener('storage', event => this._handleStorage(event.key, event.newValue))
      }
    }
  }

  /** True if a refresh can renew the session (body mode: a refresh token is present). */
  private _canRefresh(): boolean {
    return isCookieRefreshMode() ? this._sessionActive : !!this.refreshToken
  }

  /** Sends a message to the other tabs (cookie mode only). */
  private _broadcast(message: PachiAuthTabMessage): void {
    try {
      this._channel?.postMessage(message)
    } catch {
      /* channel closed */
    }
  }

  /**
   * Message of another tab (cookie mode): `logout` = local logout without requests, `login` = a
   * tab without a session tries a silent refresh (the cookie is shared), `refreshed` = informative.
   */
  private _handleTabMessage(message: PachiAuthTabMessage): void {
    if (message.type === 'logout') {
      if (this.accessToken || this._sessionActive) void this._logout(false, false)
      return
    }
    if (message.type === 'login' && !this.accessToken && !this._loggingOut) {
      void this.tryRestoreSession().then(ok => {
        const router = AuthManager._router
        if (ok && router?.currentRoute.value.meta?.noAuth) {
          void router.push(this.getPostLoginLandingPath())
        }
      })
    }
  }

  /**
   * Logout of another tab: if the persisted session (key `auth`) was cleared, this tab logs out locally
   * (no request: the refresh token has already been revoked by the other tab).
   *
   * @param key - changed key (`null` = storage cleared)
   * @param newValue - new serialized value
   */
  private _handleStorage(key: string | null, newValue: string | null): void {
    if (key !== null && key !== 'auth') return
    if (!this.store.access_token && !this.store.refresh_token) return
    let state: { access_token?: string | null; refresh_token?: string | null } | null = null
    try {
      state = newValue ? JSON.parse(newValue) : null
    } catch {
      return
    }
    if (!state?.access_token && !state?.refresh_token) void this.logout(false)
  }

  /**
   * Schedules the token refresh 60s before expiry. If it is already expiring (or expired, e.g.
   * after a reload) it runs immediately; after a successful refresh the minimum delay is 5s (avoids loops with
   * very short tokens). A failure is retried 2 times (15s) then logs out.
   */
  private _scheduleRenew(afterRefresh = false) {
    if (this._renewTimer) clearTimeout(this._renewTimer)
    this._renewTimer = null
    const exp = this.store.expires_at
    if (!exp) return
    let delay = exp - Date.now() - 60_000 // 60s before expiry
    if (delay <= 0) delay = afterRefresh ? 5_000 : 0
    this._renewTimer = setTimeout(() => {
      this._renewTimer = null
      this.requestRefreshToken().catch(e => this._onRenewFailed(e))
    }, delay)
  }

  /** Retry of the scheduled refresh (max 2 times at 15s) and then logout. */
  private _onRenewFailed(error?: unknown) {
    if (!this._canRefresh()) return
    const status = statusOf(error)
    // refresh token rejected (revoked, expired, already used; cookie mode: also 403
    // `auth.csrf_rejected`, a configuration error that a retry cannot fix): pointless to retry
    if (status === 401 || (status === 403 && isCookieRefreshMode())) {
      this._renewFailures = 0
      void this.logout(false)
      return
    }
    if (++this._renewFailures > 2) {
      this._renewFailures = 0
      void this.logout(false)
      return
    }
    if (this._renewTimer) clearTimeout(this._renewTimer)
    this._renewTimer = setTimeout(() => {
      this._renewTimer = null
      this.requestRefreshToken().catch(e => this._onRenewFailed(e))
    }, 15_000)
  }

  public get accessToken() {
    return this.store?.access_token
  }
  public set accessToken(value: string | null) {
    if (value) {
      this.store.setToken(value)
    } else {
      this.store.clearToken()
    }
  }
  public get tokenType() {
    return this.store?.token_type
  }
  public set tokenType(value: string | null) {
    if (value) {
      this.store.token_type = value
    } else {
      this.store.token_type = null
    }
  }
  public get refreshToken() {
    return this.store.refresh_token
  }
  public set refreshToken(value: string | null) {
    if (value) {
      this.store.refresh_token = value
    } else {
      this.store.refresh_token = null
    }
  }

  private _getWsBaseUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}`
  }

  /** Opens the events connection; with `force` it reopens even if already connected (the store closes the previous one). */
  private _connectEvents(force = false): void {
    if (!this.accessToken) return
    void import('../../stores/pachi-events').then(({ usePachiEventsStore }) => {
      const store = usePachiEventsStore()
      if ((store.connected || store.hasManager()) && !force) return
      // getter: at every reconnection the URL uses the current token (not the one of the first connection)
      store.connect(this._getWsBaseUrl(), () => this.accessToken)
    })
  }

  /**
   * Requests the single-use ticket to open the events WebSocket (`POST /api/core/events/ticket`, expires
   * in ~30s: a new one is requested at every (re)connection).
   *
   * @returns the ticket, or `null` if the backend does not support it (404/405: older version, `?token=` is used)
   * @throws the request error (e.g. 401, network) in the other cases
   */
  public async fetchEventsTicket(): Promise<string | null> {
    const core = getUseAlovaInstance()({ url: '/api/core' }).alova
    try {
      const response = await core.Post<{ ticket?: string }>('/events/ticket', undefined, {
        autoError: false,
        showOverlay: false
      })
      return response?.ticket ?? null
    } catch (error) {
      const status = (error as { status?: number }).status
      if (status === 404 || status === 405) return null
      throw error
    }
  }

  /** True if the first login step asked for the second factor and the challenge is still in progress. */
  public get hasPendingMfa(): boolean {
    return this._mfaToken !== null
  }

  /** Abandons the ongoing MFA challenge (e.g. "Back" in the login page). */
  public cancelMfa(): void {
    this._mfaToken = null
  }

  /**
   * First login step (`POST /api/auth/token`). Without MFA it completes the login (token, user, events,
   * `next`/home redirect) and returns `{ mfaRequired: false }`. If the backend answers
   * `{ mfa_required: true, mfa_token }` it keeps the `mfa_token` in memory only and returns
   * `{ mfaRequired: true }`: the app must ask for the code and call {@link verifyMfa}.
   *
   * @param username - username
   * @param password - password
   * @returns whether the second step is needed
   * @throws the request error (e.g. 401 `auth.invalid_credentials`); does NOT show the client dialog:
   *   the login page handles it
   */
  public async login(username: string, password: string): Promise<LoginResult> {
    // a logout still in progress (WS disconnection) must finish before the new login
    if (this._loggingOut) await this._loggingOut
    this._mfaToken = null
    try {
      // errors (401 credentials, 429 with Retry-After) shown inline by the page: no automatic dialog
      const raw = await this.api.$form<unknown>(
        '/token',
        { username, password, scope: '', grant_type: 'password' },
        // cookie mode: the response sets the HttpOnly refresh cookie
        isCookieRefreshMode()
          ? { meta: { autoError: false }, credentials: 'include' }
          : { meta: { autoError: false } }
      )
      const response = unwrapAuthResponse<ITokenResponse | IMfaRequiredResponse>(raw)
      if (isMfaRequired(response)) {
        this._mfaToken = response.mfa_token
        return { mfaRequired: true }
      }
      await this._completeLogin(response)
      return { mfaRequired: false }
    } catch (error: unknown) {
      console.error('Login failed:', error)
      throw error
    }
  }

  /**
   * Second login step (`POST /api/mfa/verify`, `{ mfa_token, code }`): the code is the 6-digit TOTP/OTP
   * or a backup code. On success it completes the login like {@link login}. Errors do NOT show the
   * client dialog (the page handles them): if the challenge is no longer valid (`mfa.token_invalid`,
   * `mfa.challenge_not_found`, `mfa.not_configured`) or the account is locked (429) the MFA token is discarded
   * and `hasPendingMfa` becomes false (restart from the first step); with `mfa.code_invalid` it can be retried.
   *
   * @param code - code entered by the user
   * @throws the request error (`ResponseError`) or `Error` if there is no challenge in progress
   */
  public async verifyMfa(code: string): Promise<void> {
    const mfaToken = this._mfaToken
    if (!mfaToken) throw new Error('No MFA challenge in progress')
    let tokens: ITokenResponse
    try {
      const mfa = getUseAlovaInstance()({ url: '/api/mfa' }).alova
      const raw = await mfa.Post<unknown>(
        '/verify',
        { mfa_token: mfaToken, code: code.trim() },
        isCookieRefreshMode()
          ? { autoError: false, showOverlay: false, credentials: 'include' }
          : { autoError: false, showOverlay: false }
      )
      tokens = unwrapAuthResponse<ITokenResponse>(raw)
    } catch (error: unknown) {
      const status = (error as { status?: number } | null)?.status
      const errorCode = await getErrorCode(error)
      if (status === 429 || (errorCode && MFA_DEAD_CODES.has(errorCode))) this._mfaToken = null
      throw error
    }
    this._mfaToken = null
    await this._completeLogin(tokens)
  }

  /** Completes the login: saves the tokens, loads the user, opens the events, schedules the renewal and navigates. */
  private async _completeLogin(tokens: ITokenResponse): Promise<void> {
    this.store.setAllTokens(tokens)
    this._sessionActive = true
    this._lastRefreshAt = Date.now()
    this.userInfo = await this.getUserInfo()
    this._renewFailures = 0
    this._connectEvents()
    this._scheduleRenew()
    this._broadcast({ type: 'login' })
    await AuthManager._router?.push(this.getPostLoginLandingPath())
  }

  /**
   * Logs out: if the session is still valid it notifies the backend (`POST /api/auth/logout` with
   * `{ refresh_token }`, which revokes only this login; best effort: JWTs stay valid until
   * expiry), then discards the tokens, closes the WebSocket and goes to login.
   *
   * @param notify - false when the session is already invalid (e.g. after a 401 or a password change, which
   *   already revokes everything): skips the backend call
   */
  public logout(notify = true): Promise<void> {
    return this._logout(notify, true)
  }

  /**
   * @param notify - see {@link logout}
   * @param broadcast - cookie mode: tell the other tabs (false when the logout comes from them)
   */
  private _logout(notify: boolean, broadcast: boolean): Promise<void> {
    this._loggingOut ??= this._doLogout(notify, broadcast).finally(() => {
      this._loggingOut = null
    })
    return this._loggingOut
  }

  private async _doLogout(notify: boolean, broadcast: boolean): Promise<void> {
    this._epoch++
    if (notify && this.accessToken) {
      // cookie mode: the backend revokes the session of the cookie and clears it (body `{}`);
      // body mode: with the refresh token only this login is revoked (older backends ignore it)
      const body = this.refreshToken ? { refresh_token: this.refreshToken } : undefined
      const request = isCookieRefreshMode()
        ? this.api.alova.Post('/logout', {}, cookieAuthRequest())
        : this.api.alova.Post('/logout', body, { autoError: false, showOverlay: false })
      await request.catch(() => undefined)
    }
    this._sessionActive = false
    this._lastRefreshAt = 0
    this._sessionRefreshed = false
    this._renewFailures = 0
    this._mfaToken = null
    if (this._renewTimer) {
      clearTimeout(this._renewTimer)
      this._renewTimer = null
    }
    // wait for the WebSocket disconnection: an immediate login must not find the old manager
    try {
      const { usePachiEventsStore } = await import('../../stores/pachi-events')
      usePachiEventsStore().disconnect()
    } catch {
      /* the WebSocket is optional */
    }
    this.store.clearAllTokens()
    this.store.userInfo = null
    notifyPachiAuthChanged(null)
    if (broadcast) this._broadcast({ type: 'logout' })
    await AuthManager._router?.push('/auth/login')
  }
  public static setRouter(router: Router): void {
    AuthManager._router = router
  }
  public async getUserInfo(): Promise<IUserInfo> {
    return await this.api.alova.Get<IUserInfo>('/user', { cacheFor: 0 }).then((response: IUserInfo) => {
      return response
    })
  }
  /**
   * Extra user info (engines) from `GET /api/infos/engines` (superuser only). If the endpoint is not
   * available (403 for a non-superuser user, 404 if disabled by the backend) it returns an empty list
   * without showing errors.
   */
  public async getExtraInfo(): Promise<{ engines: IEngineInfo[] }> {
    try {
      const infos = getUseAlovaInstance()({ url: '/api/infos' }).alova
      const engineInfo = await infos.Get<IEngineInfo[]>('/engines', { autoError: false })
      this.store.engineInfo = engineInfo
      return { engines: engineInfo }
    } catch {
      this.store.engineInfo = []
      return { engines: [] }
    }
  }
  public get userInfo(): IUserInfo | null {
    return this.store.userInfo
  }
  /**
   * Sets the user data; `userInfoVersion` (which remounts the page) changes ONLY if the data is
   * really different, so a token refresh does not lose the state of open forms and dialogs.
   */
  public set userInfo(value: IUserInfo | null) {
    const changed = !isSameUserInfo(this.store.userInfo, value)
    this.store.userInfo = value
    if (changed) this.store.bumpUserInfoVersion()
    // packages (e.g. settings) hook into the `pachi:auth-changed` event, without importing the shell
    notifyPachiAuthChanged(value)
  }
  public get isAuthenticated(): boolean {
    return !!this.accessToken && !!this.userInfo
  }

  public isAdminUser(): boolean {
    return this.userInfo?.isSuperuser ?? false
  }
  public isStaffUser(): boolean {
    return this.userInfo?.isStaff ?? false
  }

  /** Page after login (without `?next=`): home. Derived apps can change it. */
  public getDefaultLandingPath(): string {
    return '/'
  }

  public getPostLoginLandingPath(): string {
    const next = AuthManager._router?.currentRoute.value.query.next
    return safeNextPath(next, this.getDefaultLandingPath())
  }
  /**
   * Renews the access token. Single-flight: concurrent calls (parallel 401s, timer, guard)
   * share the same `POST /refresh-token` request.
   */
  public requestRefreshToken(): Promise<void> {
    this._refreshing ??= this._doRefresh().finally(() => {
      this._refreshing = null
    })
    return this._refreshing
  }

  /**
   * With multiple tabs the persisted session is shared: if another tab has already rotated the refresh token
   * (single-use) and its access token is valid that state is adopted without a new refresh; if the token
   * changed but the access token is no longer valid the most recent refresh token is used.
   *
   * @returns true if the adopted state makes the refresh unnecessary
   */
  private _adoptPersistedSession(): boolean {
    const persisted = readPersistedAuth()
    if (!persisted?.refresh_token || persisted.refresh_token === this.store.refresh_token) return false
    // storage may lag behind memory (write not done yet): adopt only if more recent
    if ((persisted.expires_at ?? 0) <= (this.store.expires_at ?? 0)) return false
    this.store.refresh_token = persisted.refresh_token
    const exp = persisted.expires_at
    if (persisted.access_token && exp && exp - Date.now() > 60_000) {
      this.store.access_token = persisted.access_token
      this.store.token_type = persisted.token_type ?? this.store.token_type
      this.store.expires_at = exp
      return true
    }
    return false
  }

  /**
   * Cookie mode refresh: `POST /refresh-token` with the HttpOnly cookie, body `{}` and the
   * `X-Pachi-Auth` header, inside the cross-tab lock (the cookie is single-use: two tabs must not
   * rotate it together). A refresh of this tab done moments ago is reused.
   */
  private async _doCookieRefresh(): Promise<void> {
    const epoch = this._epoch
    const response = await withRefreshLock(async () => {
      const fresh = (this.store.expires_at ?? 0) - Date.now() > 60_000
      if (this.accessToken && fresh && Date.now() - this._lastRefreshAt < REFRESH_DEDUPE_MS) {
        return null
      }
      return await this._postCookieRefresh()
    })
    // nothing to do, or logout happened while the refresh was in flight
    if (!response || epoch !== this._epoch) return
    this.store.access_token = response.access_token
    this.store.token_type = response.token_type
    this.store.expires_at = decodeJwtExpiry(response.access_token)
    this._sessionActive = true
    this._lastRefreshAt = Date.now()
    this._renewFailures = 0
    this.userInfo = await this.getUserInfo()
    this._connectEvents()
    this._scheduleRenew(true)
    this._broadcast({ type: 'refreshed', expires_at: this.store.expires_at })
  }

  /**
   * The cookie `POST /refresh-token`. A 401 is retried once after a short pause: if another tab
   * (or browser without Web Locks) rotated the single-use cookie at the same moment, the backend
   * grace window lets the retry with the new cookie succeed. 403 `auth.csrf_rejected` is a
   * configuration error: logged, never retried.
   *
   * @param retried - true on the second attempt
   * @returns the new access token
   */
  private async _postCookieRefresh(retried = false): Promise<ITokenResponse> {
    try {
      const raw = await this.api.alova.Post<unknown>('/refresh-token', {}, cookieAuthRequest())
      return unwrapAuthResponse<ITokenResponse>(raw)
    } catch (error: unknown) {
      const status = statusOf(error)
      if (status === 403 && (await getErrorCode(error)) === 'auth.csrf_rejected') {
        console.error(
          '[pachi] /refresh-token rejected as CSRF (auth.csrf_rejected): the ' +
            `${PACHI_AUTH_REFRESH_HEADER} header must reach the backend and the request Origin` +
            ' must match the backend host' +
            ' (serve the API from the same origin, e.g. through a proxy)'
        )
        throw error
      }
      if (status === 401 && !retried) {
        await new Promise(resolve => setTimeout(resolve, REFRESH_RACE_RETRY_MS))
        return await this._postCookieRefresh(true)
      }
      throw error
    }
  }

  private async _doRefresh(): Promise<void> {
    if (isCookieRefreshMode()) return await this._doCookieRefresh()
    if (!this.refreshToken) {
      console.warn('No refresh token available')
      await this.logout()
      return
    }
    if (this._adoptPersistedSession()) {
      this._renewFailures = 0
      this._scheduleRenew(true)
      return
    }
    const response = await this.api.alova.Post<ITokenResponse>(
      '/refresh-token',
      { refresh_token: this.refreshToken },
      { autoError: false, showOverlay: false }
    )
    // logout happened while the refresh was in flight: do not reinstall the session
    if (!this.refreshToken) return
    this.store.access_token = response.access_token
    this.store.token_type = response.token_type
    // rotating refresh tokens: the one used is now spent and must be replaced (absent with rotation disabled)
    if (response.refresh_token) this.store.refresh_token = response.refresh_token
    this.store.expires_at = decodeJwtExpiry(response.access_token)
    this._renewFailures = 0
    this.userInfo = await this.getUserInfo()
    this._connectEvents()
    this._scheduleRenew(true)
  }

  public async refreshUserInfo(): Promise<void> {
    if (!this.isAuthenticated) return
    const wasSuperuser = this.userInfo?.isSuperuser ?? false
    this.userInfo = await this.getUserInfo()
    // the backend decides who receives the login/activity events when the WebSocket opens: if the
    // superuser state changes a reconnection is needed for the new state to take effect
    if ((this.userInfo?.isSuperuser ?? false) !== wasSuperuser) this._connectEvents(true)
  }

  public async tryRestoreSession(): Promise<boolean> {
    if (this.isAuthenticated) {
      this._connectEvents()
      // after a reload the store is already authenticated: packages listening to the event must know right away
      notifyPachiAuthChanged(this.userInfo)
      // after a reload the persisted store is already authenticated: the token renewal must be rescheduled
      if (!this._renewTimer) this._scheduleRenew()
      if (!this._sessionRefreshed) {
        this._sessionRefreshed = true
        void this.refreshUserInfo()
      }
      return true
    }
    // cookie mode: the refresh cookie is invisible to the client, so the refresh is always tried
    if (!isCookieRefreshMode() && !this.refreshToken) return false
    try {
      await this.requestRefreshToken()
      return this.isAuthenticated
    } catch {
      this._sessionActive = false
      this.store.clearAllTokens()
      notifyPachiAuthChanged(null)
      return false
    }
  }
  /**
   * Checks whether the current user can access a route according to its meta.
   * Superusers bypass all checks.
   * Order: superuser → requireSuperuser → requireStaff → permissions
   */
  public canAccess(meta: RouteMeta): boolean {
    if (!this.isAuthenticated) return false
    if (this.isAdminUser()) return true
    if (meta.requireSuperuser) return false
    if (meta.requireStaff && !this.isStaffUser()) return false
    const required = meta.permissions
    if (required && required.length > 0) {
      const userPerms = this.userInfo?.permissions ?? []
      return required.every(
        p => userPerms.includes(p) || userPerms.some(up => up.startsWith(`${p}.`))
      )
    }
    return true
  }
  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }
  /** Current access token for the Authorization header (`null` if there is no session or the singleton does not exist yet). */
  public static getAccessToken(): string | null {
    return AuthManager.instance?.accessToken ?? null
  }
  /** Current token type (`token_type`, usually `bearer`). */
  public static getTokenType(): string | null {
    return AuthManager.instance?.tokenType ?? null
  }
  /**
   * HTTP error handler of auth: on a 401 of an authenticated request it tries the token refresh
   * (single-flight) and repeats the request only once (`retry()`), otherwise it logs out.
   * Rethrows the error without a message when it handled it itself.
   */
  public static handleErrors(): UseAlovaResponseProcessorMap {
    return {
      '401': async ({ method, error, retry, retried }) => {
        // without Authorization (e.g. wrong credentials at login) the 401 is a normal error: it is shown
        if (!(method.config.headers as Record<string, unknown>)?.Authorization) return undefined
        // the refresh failure itself must not be retried (avoids recursion): the caller handles it
        if (method.url.endsWith('/refresh-token') || method.url.endsWith('/logout')) throw error
        // wrong credentials/code at login (even with an old token in the store): normal error
        if (method.url.endsWith('/token') || method.url.endsWith('/mfa/verify')) return undefined
        const authManager = AuthManager.getInstance()
        // already retried (second 401) or nothing to refresh with: session over
        if (retried || !authManager._canRefresh()) {
          await authManager.logout(false)
          throw error
        }
        try {
          await authManager.requestRefreshToken()
        } catch {
          await authManager.logout(false)
          throw error
        }
        return [await retry(), STOP_PROCESSOR]
      }
    }
  }
}
