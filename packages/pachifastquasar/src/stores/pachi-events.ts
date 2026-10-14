import { defineStore } from 'pinia'
import { ref } from 'vue'
import { WebSocketManager } from '../services/ws-manager/ws-manager'
import type { IWebSocketManagerHandler } from '../services/ws-manager/types/ws-manager'
import type {
  ActivityLogEntry,
  LoginEventData,
  LogoutEventData
} from '../services/ws-manager/types/pachi-events'

export const usePachiEventsStore = defineStore('pachi-events', () => {
  const connected = ref(false)
  const recentActivity = ref<ActivityLogEntry[]>([])
  const recentLogins = ref<LoginEventData[]>([])
  const recentLogouts = ref<LogoutEventData[]>([])

  let _manager: WebSocketManager | null = null
  /** Handler registrati dall'esterno: vivono nello store e si riapplicano a ogni `connect()`. */
  const _externalHandlers = new Map<string, Set<IWebSocketManagerHandler>>()
  /** Istante dell'ultimo 4401 gestito (per non ciclare refresh/riconnessione se il server rifiuta ancora). */
  let _lastUnauthorizedAt = 0

  /**
   * Gestisce una chiusura 4401 (token non valido o scaduto): chiede un refresh del token e riconnette
   * (l'URL è ricalcolato col token nuovo); se il refresh fallisce esegue il logout.
   */
  async function _onUnauthorized(
    tokenProvider: () => string | null,
    wsBaseUrl: string
  ): Promise<void> {
    const { AuthManager } = await import('../services/auth-manager')
    const auth = AuthManager.getInstance()
    const now = Date.now()
    const repeated = now - _lastUnauthorizedAt < 10_000
    _lastUnauthorizedAt = now
    try {
      if (repeated) throw new Error('4401 ripetuto dopo il refresh')
      await auth.requestRefreshToken()
      // requestRefreshToken riconnette da sé se serve; qui si copre il caso in cui non l'abbia fatto
      if (!hasManager()) connect(wsBaseUrl, tokenProvider)
    } catch {
      await auth.logout(false)
    }
  }

  /**
   * URL del WebSocket, ricalcolato a ogni (ri)connessione: ticket monouso (`?ticket=`) se il backend lo
   * supporta, altrimenti `?token=` (backend precedenti). Un 401 sul ticket equivale a una chiusura 4401.
   */
  async function _buildUrl(wsBaseUrl: string, tokenProvider: () => string | null): Promise<string> {
    const base = `${wsBaseUrl}/api/core/events/ws`
    try {
      const { AuthManager } = await import('../services/auth-manager')
      const ticket = await AuthManager.getInstance().fetchEventsTicket()
      if (ticket) return `${base}?ticket=${encodeURIComponent(ticket)}`
    } catch (error) {
      const failure: Error & { closeCode?: number } =
        error instanceof Error ? error : new Error(String(error))
      if ((error as { status?: number })?.status === 401) failure.closeCode = 4401
      throw failure
    }
    return `${base}?token=${encodeURIComponent(tokenProvider() ?? '')}`
  }

  /**
   * Apre la connessione agli eventi.
   *
   * @param wsBaseUrl - base `ws(s)://host`
   * @param token - token o getter del token (consigliato: a ogni riconnessione si usa quello corrente)
   */
  function connect(wsBaseUrl: string, token: string | (() => string | null)) {
    _manager?.disconnect()
    const tokenProvider = typeof token === 'function' ? token : () => token
    const manager = new WebSocketManager(() => _buildUrl(wsBaseUrl, tokenProvider))
    _manager = manager

    const _connHandler: IWebSocketManagerHandler = {
      // gli eventi di un manager non più corrente (sostituito da un connect/force) vanno ignorati
      onOpen: () => {
        if (_manager === manager) connected.value = true
      },
      onClose: code => {
        if (_manager !== manager) return
        connected.value = false
        // 4403: il backend ha cambiato il ruolo (superuser) dell'utente: ricarica i suoi dati
        if (code === 4403) {
          void import('../services/auth-manager')
            .then(({ AuthManager }) => AuthManager.getInstance().refreshUserInfo())
            .catch(() => undefined)
        }
        if (code === 4401) void _onUnauthorized(tokenProvider, wsBaseUrl)
      }
    }
    const _snapshotHandler: IWebSocketManagerHandler = {
      onMessage: data => {
        recentActivity.value = (data as ActivityLogEntry[]) ?? []
      }
    }
    const _activityHandler: IWebSocketManagerHandler = {
      onMessage: data => {
        recentActivity.value.unshift(data as ActivityLogEntry)
        if (recentActivity.value.length > 100) recentActivity.value.length = 100
      }
    }
    const _loginHandler: IWebSocketManagerHandler = {
      onMessage: data => {
        recentLogins.value.unshift(data as LoginEventData)
        if (recentLogins.value.length > 50) recentLogins.value.length = 50
      }
    }

    const _logoutHandler: IWebSocketManagerHandler = {
      onMessage: data => {
        recentLogouts.value.unshift(data as LogoutEventData)
        if (recentLogouts.value.length > 50) recentLogouts.value.length = 50
      }
    }

    manager.addHandler('__conn__', _connHandler)
    manager.addHandler('snapshot', _snapshotHandler)
    manager.addHandler('activity', _activityHandler)
    manager.addHandler('login', _loginHandler)
    manager.addHandler('logout', _logoutHandler)
    _externalHandlers.forEach((set, type) => set.forEach(h => manager.addHandler(type, h)))

    manager.connect()
  }

  /** true se esiste già una connessione (anche in corso di apertura o di riconnessione). */
  function hasManager(): boolean {
    return _manager?.isActive ?? false
  }

  function disconnect() {
    _manager?.disconnect()
    _manager = null
    connected.value = false
  }

  function addHandler(type: string, handler: IWebSocketManagerHandler) {
    const set = _externalHandlers.get(type) ?? new Set<IWebSocketManagerHandler>()
    set.add(handler)
    _externalHandlers.set(type, set)
    _manager?.addHandler(type, handler)
  }

  function removeHandler(type: string, handler: IWebSocketManagerHandler) {
    _externalHandlers.get(type)?.delete(handler)
    _manager?.removeHandler(type, handler)
  }

  return {
    connected,
    recentActivity,
    recentLogins,
    recentLogouts,
    connect,
    hasManager,
    disconnect,
    addHandler,
    removeHandler
  }
})
