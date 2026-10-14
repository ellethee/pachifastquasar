import { getUseAlovaInstance, STOP_PROCESSOR } from '@ilpachi/use-alova'
import type { UseAlovaResponseProcessorMap, UseAlovaReturn } from '@ilpachi/use-alova'
import { withFiles } from '@ilpachi/use-alova/files'
import { readPersistedAuth, useAuthStore } from './auth-store'
import type { Router, RouteMeta } from 'vue-router'
import { safeNextPath } from '../../helpers/next-path'
import { decodeJwtExpiry } from '../../helpers/jwt-helper'
import { notifyPachiAuthChanged } from '../../helpers/auth-events'
import type {
  IEngineInfo,
  IMfaRequiredResponse,
  ITokenResponse,
  IUserInfo,
  LoginResult
} from './types/auth-manager'

/**
 * Confronto dei dati utente rilevanti (per decidere se rimontare la UI dopo un refresh).
 *
 * @param a - dati precedenti
 * @param b - dati nuovi
 * @returns true se i campi rilevanti coincidono
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
 * Estrae il corpo utile di una risposta di auth: se il backend ha avvolto la risposta nell'envelope
 * (`{ success, message, data }`, es. `/mfa/verify` con il client senza `unwrapEnvelope`) restituisce `data`.
 *
 * @param response - risposta ricevuta dal client
 * @returns il payload senza envelope
 */
export function unwrapAuthResponse<T>(response: unknown): T {
  if (response !== null && typeof response === 'object') {
    const r = response as { success?: unknown; data?: unknown }
    if ('success' in r && r.data !== null && typeof r.data === 'object') return r.data as T
  }
  return response as T
}

/**
 * Vero se la risposta di `/auth/token` chiede il secondo fattore (`{ mfa_required: true, mfa_token }`).
 *
 * @param response - payload già privo di envelope
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
 * Codice stabile (`detail[0].code`) di un errore HTTP del backend, se presente.
 *
 * @param error - errore del client (`ResponseError`) o altro
 * @returns il codice (es. `mfa.code_invalid`) oppure `undefined`
 */
export async function getErrorCode(error: unknown): Promise<string | undefined> {
  const reader = (error as { safeResponseData?: () => Promise<unknown> } | null)?.safeResponseData
  if (typeof reader !== 'function') return undefined
  try {
    const body = (await reader.call(error)) as { detail?: unknown } | null
    const detail = body?.detail
    if (Array.isArray(detail)) return (detail[0] as { code?: string } | undefined)?.code
  } catch {
    /* corpo non leggibile */
  }
  return undefined
}

/** Codici di `/mfa/verify` dopo i quali la sfida in corso non è più utilizzabile (si riparte dal login). */
const MFA_DEAD_CODES = new Set(['mfa.token_invalid', 'mfa.challenge_not_found', 'mfa.not_configured'])

export class AuthManager {
  private static instance: AuthManager
  private static _router: Router | null = null
  private api: ReturnType<typeof withFiles<UseAlovaReturn>>
  private store: ReturnType<typeof useAuthStore>
  private _renewTimer: ReturnType<typeof setTimeout> | null = null
  private _sessionRefreshed = false
  /** Refresh in corso: condiviso da tutti i chiamanti (single-flight). */
  private _refreshing: Promise<void> | null = null
  /** Logout in corso: condiviso da tutti i chiamanti. */
  private _loggingOut: Promise<void> | null = null
  /** Fallimenti consecutivi del refresh schedulato (per il retry prima del logout). */
  private _renewFailures = 0
  /** Token della sfida MFA in corso: SOLO in memoria (mai in storage, mai loggato). */
  private _mfaToken: string | null = null

  private constructor() {
    this.store = useAuthStore()
    this.api = withFiles(getUseAlovaInstance()({ url: '/api/auth' }))
    AuthManager.instance = this
    // con più schede (localStorage) il logout fatto in un'altra scheda arriva qui come evento `storage`
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => this._handleStorage(event.key, event.newValue))
    }
  }

  /**
   * Logout di un'altra scheda: se la sessione persistita (chiave `auth`) è stata svuotata, questa scheda esce in locale
   * (nessuna richiesta: il refresh token è già stato revocato dall'altra scheda).
   *
   * @param key - chiave modificata (`null` = storage svuotato)
   * @param newValue - nuovo valore serializzato
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
   * Programma il refresh del token 60s prima della scadenza. Se è già in scadenza (o scaduto, ad es.
   * dopo un reload) lo esegue subito; dopo un refresh riuscito il ritardo minimo è 5s (evita loop con
   * token molto brevi). Un fallimento viene ritentato 2 volte (15s) poi esegue il logout.
   */
  private _scheduleRenew(afterRefresh = false) {
    if (this._renewTimer) clearTimeout(this._renewTimer)
    this._renewTimer = null
    const exp = this.store.expires_at
    if (!exp) return
    let delay = exp - Date.now() - 60_000 // 60s prima della scadenza
    if (delay <= 0) delay = afterRefresh ? 5_000 : 0
    this._renewTimer = setTimeout(() => {
      this._renewTimer = null
      this.requestRefreshToken().catch(e => this._onRenewFailed(e))
    }, delay)
  }

  /** Retry del refresh schedulato (max 2 volte a 15s) e poi logout. */
  private _onRenewFailed(error?: unknown) {
    if (!this.refreshToken) return
    // refresh token rifiutato (revocato, scaduto, già usato): inutile riprovare
    if ((error as { status?: number } | null)?.status === 401) {
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

  /** Apre la connessione agli eventi; con `force` riapre anche se è già connessa (lo store chiude la precedente). */
  private _connectEvents(force = false): void {
    if (!this.accessToken) return
    void import('../../stores/pachi-events').then(({ usePachiEventsStore }) => {
      const store = usePachiEventsStore()
      if ((store.connected || store.hasManager()) && !force) return
      // getter: a ogni riconnessione l'URL usa il token corrente (non quello del primo collegamento)
      store.connect(this._getWsBaseUrl(), () => this.accessToken)
    })
  }

  /**
   * Richiede il ticket monouso per aprire il WebSocket degli eventi (`POST /api/core/events/ticket`, scade
   * in ~30s: se ne chiede uno nuovo a ogni (ri)connessione).
   *
   * @returns il ticket, oppure `null` se il backend non lo supporta (404/405: versione precedente, si usa `?token=`)
   * @throws l'errore della richiesta (es. 401, rete) negli altri casi
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

  /** Vero se il primo step di login ha chiesto il secondo fattore e la sfida è ancora in corso. */
  public get hasPendingMfa(): boolean {
    return this._mfaToken !== null
  }

  /** Abbandona la sfida MFA in corso (es. "Indietro" nella pagina di login). */
  public cancelMfa(): void {
    this._mfaToken = null
  }

  /**
   * Primo step del login (`POST /api/auth/token`). Senza MFA completa il login (token, utente, eventi,
   * redirect `next`/home) e restituisce `{ mfaRequired: false }`. Se il backend risponde
   * `{ mfa_required: true, mfa_token }` conserva il `mfa_token` solo in memoria e restituisce
   * `{ mfaRequired: true }`: l'app deve chiedere il codice e chiamare {@link verifyMfa}.
   *
   * @param username - nome utente
   * @param password - password
   * @returns se serve il secondo step
   * @throws l'errore della richiesta (es. 401 `auth.invalid_credentials`); NON mostra il dialog del client:
   *   lo gestisce la pagina di login
   */
  public async login(username: string, password: string): Promise<LoginResult> {
    // un logout ancora in corso (disconnessione del WS) deve finire prima del nuovo login
    if (this._loggingOut) await this._loggingOut
    this._mfaToken = null
    try {
      // errori (401 credenziali, 429 con Retry-After) mostrati inline dalla pagina: niente dialog automatico
      const raw = await this.api.$form<unknown>(
        '/token',
        { username, password, scope: '', grant_type: 'password' },
        { meta: { autoError: false } }
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
   * Secondo step del login (`POST /api/mfa/verify`, `{ mfa_token, code }`): il codice è il TOTP/OTP a 6 cifre
   * o un codice di backup. A buon fine completa il login come {@link login}. Gli errori NON mostrano il
   * dialog del client (li gestisce la pagina): se la sfida non è più valida (`mfa.token_invalid`,
   * `mfa.challenge_not_found`, `mfa.not_configured`) o l'account è bloccato (429) il token MFA viene scartato
   * e `hasPendingMfa` diventa false (si riparte dal primo step); con `mfa.code_invalid` si può riprovare.
   *
   * @param code - codice inserito dall'utente
   * @throws l'errore della richiesta (`ResponseError`) o `Error` se non c'è una sfida in corso
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
        { autoError: false, showOverlay: false }
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

  /** Chiude il login: salva i token, carica l'utente, apre gli eventi, programma il rinnovo e naviga. */
  private async _completeLogin(tokens: ITokenResponse): Promise<void> {
    this.store.setAllTokens(tokens)
    this.userInfo = await this.getUserInfo()
    this._renewFailures = 0
    this._connectEvents()
    this._scheduleRenew()
    await AuthManager._router?.push(this.getPostLoginLandingPath())
  }

  /**
   * Esce: se la sessione è ancora valida notifica il backend (`POST /api/auth/logout` con
   * `{ refresh_token }`, che revoca solo questo login; best effort: i JWT restano validi fino alla
   * scadenza), poi scarta i token, chiude il WebSocket e va al login.
   *
   * @param notify - false quando la sessione è già invalida (es. dopo un 401 o un cambio password, che
   *   revoca già tutto): salta la chiamata al backend
   */
  public logout(notify = true): Promise<void> {
    this._loggingOut ??= this._doLogout(notify).finally(() => {
      this._loggingOut = null
    })
    return this._loggingOut
  }

  private async _doLogout(notify: boolean): Promise<void> {
    if (notify && this.accessToken) {
      // con il refresh token si revoca solo questa sessione; un backend precedente ignora il corpo
      const body = this.refreshToken ? { refresh_token: this.refreshToken } : undefined
      await this.api.alova
        .Post('/logout', body, { autoError: false, showOverlay: false })
        .catch(() => undefined)
    }
    this._sessionRefreshed = false
    this._renewFailures = 0
    this._mfaToken = null
    if (this._renewTimer) {
      clearTimeout(this._renewTimer)
      this._renewTimer = null
    }
    // si attende la disconnessione del WebSocket: un login immediato non deve trovare il vecchio manager
    try {
      const { usePachiEventsStore } = await import('../../stores/pachi-events')
      usePachiEventsStore().disconnect()
    } catch {
      /* il WebSocket è opzionale */
    }
    this.store.clearAllTokens()
    this.store.userInfo = null
    notifyPachiAuthChanged(null)
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
   * Info extra dell'utente (engines) da `GET /api/infos/engines` (solo superuser). Se l'endpoint non è
   * disponibile (403 per utente non superuser, 404 se disabilitato dal backend) restituisce una lista vuota
   * senza mostrare errori.
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
   * Imposta i dati utente; `userInfoVersion` (che rimonta la pagina) cambia SOLO se i dati sono
   * davvero diversi, così un refresh del token non fa perdere lo stato di form e dialog aperti.
   */
  public set userInfo(value: IUserInfo | null) {
    const changed = !isSameUserInfo(this.store.userInfo, value)
    this.store.userInfo = value
    if (changed) this.store.bumpUserInfoVersion()
    // i package (es. impostazioni) si agganciano all'evento `pachi:auth-changed`, senza importare la shell
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

  /** Pagina dopo il login (senza `?next=`): la home. Le app derivate possono cambiarla. */
  public getDefaultLandingPath(): string {
    return '/'
  }

  public getPostLoginLandingPath(): string {
    const next = AuthManager._router?.currentRoute.value.query.next
    return safeNextPath(next, this.getDefaultLandingPath())
  }
  /**
   * Rinnova l'access token. Single-flight: chiamate concorrenti (401 in parallelo, timer, guard)
   * condividono la stessa richiesta `POST /refresh-token`.
   */
  public requestRefreshToken(): Promise<void> {
    this._refreshing ??= this._doRefresh().finally(() => {
      this._refreshing = null
    })
    return this._refreshing
  }

  /**
   * Con più schede la sessione persistita è condivisa: se un'altra scheda ha già ruotato il refresh token
   * (monouso) e il suo access token è valido si adotta quello stato senza un nuovo refresh; se il token è
   * cambiato ma l'access token non è più valido si usa il refresh token più recente.
   *
   * @returns true se lo stato adottato rende inutile il refresh
   */
  private _adoptPersistedSession(): boolean {
    const persisted = readPersistedAuth()
    if (!persisted?.refresh_token || persisted.refresh_token === this.store.refresh_token) return false
    // lo storage può essere indietro rispetto alla memoria (scrittura non ancora fatta): si adotta solo se più recente
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

  private async _doRefresh(): Promise<void> {
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
    // logout avvenuto mentre il refresh era in volo: non si reinstalla la sessione
    if (!this.refreshToken) return
    this.store.access_token = response.access_token
    this.store.token_type = response.token_type
    // refresh token rotanti: quello usato è ormai speso, va sostituito (assente con rotazione disattivata)
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
    // il backend decide chi riceve gli eventi login/activity all'apertura del WebSocket: se cambia
    // lo stato di superuser bisogna riconnettersi perché il nuovo stato abbia effetto
    if ((this.userInfo?.isSuperuser ?? false) !== wasSuperuser) this._connectEvents(true)
  }

  public async tryRestoreSession(): Promise<boolean> {
    if (this.isAuthenticated) {
      this._connectEvents()
      // dopo un reload lo store è già autenticato: i package che ascoltano l'evento devono saperlo subito
      notifyPachiAuthChanged(this.userInfo)
      // dopo un reload lo store persistito è già autenticato: serve riprogrammare il rinnovo del token
      if (!this._renewTimer) this._scheduleRenew()
      if (!this._sessionRefreshed) {
        this._sessionRefreshed = true
        void this.refreshUserInfo()
      }
      return true
    }
    if (!this.refreshToken) return false
    try {
      await this.requestRefreshToken()
      return this.isAuthenticated
    } catch {
      this.store.clearAllTokens()
      notifyPachiAuthChanged(null)
      return false
    }
  }
  /**
   * Verifica se l'utente corrente può accedere a una route in base alla sua meta.
   * I superuser bypassano tutti i controlli.
   * Ordine: superuser → requireSuperuser → requireStaff → permissions
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
  /** Access token corrente per l'header Authorization (`null` se non c'è sessione o il singleton non esiste ancora). */
  public static getAccessToken(): string | null {
    return AuthManager.instance?.accessToken ?? null
  }
  /** Tipo di token corrente (`token_type`, di norma `bearer`). */
  public static getTokenType(): string | null {
    return AuthManager.instance?.tokenType ?? null
  }
  /**
   * Handler degli errori HTTP dell'auth: su 401 di una richiesta autenticata tenta il refresh del token
   * (single-flight) e ripete la richiesta una sola volta (`retry()`), altrimenti esegue il logout.
   * Rilancia l'errore senza messaggio quando l'ha gestito lui.
   */
  public static handleErrors(): UseAlovaResponseProcessorMap {
    return {
      '401': async ({ method, error, retry, retried }) => {
        // senza Authorization (es. credenziali errate al login) il 401 è un errore normale: si mostra
        if (!(method.config.headers as Record<string, unknown>)?.Authorization) return undefined
        // il fallimento del refresh stesso non va ritentato (evita ricorsione): lo gestisce il chiamante
        if (method.url.endsWith('/refresh-token') || method.url.endsWith('/logout')) throw error
        // credenziali/codice errati nel login (anche con un token vecchio nello store): errore normale
        if (method.url.endsWith('/token') || method.url.endsWith('/mfa/verify')) return undefined
        const authManager = AuthManager.getInstance()
        // già ritentata (secondo 401) o niente refresh token: sessione finita
        if (retried || !authManager.refreshToken) {
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
