import type { IWebSocketManagerHandler, IWebSocketManagerMessage } from './types/ws-manager'

/** WebSocket URL: string, synchronous or asynchronous getter (e.g. with a single-use ticket to request at every open). */
export type WebSocketUrl = string | (() => string | Promise<string>)

/** Error of the asynchronous URL getter: `closeCode` (e.g. 4401) is treated as if it came from the socket close. */
export interface WebSocketUrlError extends Error {
  closeCode?: number
}

export class WebSocketManager {
  private static instance: WebSocketManager | null = null

  public static getInstance(url: WebSocketUrl): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(url)
    }
    return WebSocketManager.instance
  }

  private socket: WebSocket | null = null
  /** Fixed URL or getter: with the getter the URL (and token) is recomputed at every (re)connection. */
  private url: WebSocketUrl
  /** Incremented at every open/disconnect: discards superseded asynchronous opens. */
  private openGeneration = 0
  private handlers: Map<string, Set<IWebSocketManagerHandler>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private readonly maxReconnectDelay = 30000
  private shouldReconnect = false
  /** Close code sent by the server for a missing, invalid or expired token: reconnecting with the same token is pointless. */
  private static readonly CLOSE_UNAUTHORIZED = 4401
  /** The backend closes with 4403 when the superuser role changes: reconnect immediately, same token. */
  private static readonly CLOSE_ROLE_CHANGED = 4403
  /**
   * Consecutive failed open attempts before giving up, if the connection has NEVER been opened.
   * A rejected handshake (e.g. 403 because the backend has events disabled) is, for the browser, just a
   * 1006 close without `open`: retrying forever would be useless. After the first successful open it
   * always retries (the backend may be temporarily unreachable).
   */
  private static readonly MAX_INITIAL_FAILURES = 5
  private lastRoleReconnect = 0
  private everOpened = false
  private initialFailures = 0

  constructor(url: WebSocketUrl) {
    this.url = url
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  /** true if the connection is open, opening or reconnecting (false after disconnect, 4401 or too many failures). */
  get isActive(): boolean {
    return this.shouldReconnect
  }

  connect() {
    const state = this.socket?.readyState
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return
    this.shouldReconnect = true
    this._open()
  }

  private _open() {
    const generation = ++this.openGeneration
    let target: string | Promise<string>
    try {
      target = typeof this.url === 'function' ? this.url() : this.url
    } catch (error) {
      this._handleClose((error as WebSocketUrlError).closeCode ?? 1006)
      return
    }
    if (typeof target === 'string') {
      this._attach(target)
      return
    }
    target.then(
      (url) => {
        if (generation === this.openGeneration && this.shouldReconnect) this._attach(url)
      },
      (error: WebSocketUrlError) => {
        if (generation === this.openGeneration && this.shouldReconnect) {
          this._handleClose(error?.closeCode ?? 1006)
        }
      }
    )
  }

  private _attach(url: string) {
    const socket = new WebSocket(url)
    this.socket = socket

    this.socket.onopen = () => {
      this.everOpened = true
      this.initialFailures = 0
      this.reconnectDelay = 1000
      this.handlers.forEach(set => set.forEach(h => h.onOpen?.()))
    }

    this.socket.onclose = (event) => this._handleClose(event.code)

    this.socket.onerror = error => {
      this.handlers.forEach(set => set.forEach(h => h.onError?.(error)))
    }

    this.socket.onmessage = event => {
      let msg: IWebSocketManagerMessage
      try {
        msg = JSON.parse(event.data as string) as IWebSocketManagerMessage
      } catch {
        return
      }
      // `ping` has no `data` nor `timestamp`: always check `type` before reading `data`
      if (!msg || typeof msg.type !== 'string' || msg.type === 'ping') return
      this.handlers.get(msg.type)?.forEach(h => h.onMessage?.(msg.data))
    }
  }

  /** Handles the close (or open failure) with the reconnection rules. */
  private _handleClose(code: number) {
    this.handlers.forEach(set => set.forEach(h => h.onClose?.(code)))
    if (code === WebSocketManager.CLOSE_ROLE_CHANGED && this.shouldReconnect) {
      // not an error: no backoff nor failure count (except closely repeated 4403s: avoids a loop)
      const now = Date.now()
      const quick = now - this.lastRoleReconnect < 1000
      this.lastRoleReconnect = now
      if (!quick) {
        this._open()
        return
      }
    }
    if (code === WebSocketManager.CLOSE_UNAUTHORIZED) this.shouldReconnect = false
    if (!this.everOpened && ++this.initialFailures >= WebSocketManager.MAX_INITIAL_FAILURES) {
      this.shouldReconnect = false
    }
    if (this.shouldReconnect) {
      this.reconnectTimer = setTimeout(() => this._open(), this.reconnectDelay)
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
    }
  }

  disconnect() {
    this.shouldReconnect = false
    this.openGeneration++
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    const socket = this.socket
    this.socket = null
    if (socket) {
      // voluntary close: no events from the old socket (may arrive after a new connect)
      socket.onopen = socket.onclose = socket.onerror = socket.onmessage = null
      socket.close()
    }
  }

  sendMessage(message: string) {
    if (!this.isConnected || !this.socket) {
      console.warn('WebSocket not open. Cannot send message.')
      return
    }
    this.socket.send(message)
  }

  addHandler(key: string, handler: IWebSocketManagerHandler) {
    const set = this.handlers.get(key) ?? new Set<IWebSocketManagerHandler>()
    set.add(handler)
    this.handlers.set(key, set)
  }

  removeHandler(key: string, handler: IWebSocketManagerHandler) {
    this.handlers.get(key)?.delete(handler)
  }
}
