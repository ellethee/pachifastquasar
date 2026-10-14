import type { IWebSocketManagerHandler, IWebSocketManagerMessage } from './types/ws-manager'

/** URL del WebSocket: stringa, getter sincrono o asincrono (es. con ticket monouso da richiedere a ogni apertura). */
export type WebSocketUrl = string | (() => string | Promise<string>)

/** Errore del getter asincrono dell'URL: `closeCode` (es. 4401) è trattato come se arrivasse dalla chiusura del socket. */
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
  /** URL fisso o getter: con il getter l'URL (e il token) è ricalcolato a ogni (ri)connessione. */
  private url: WebSocketUrl
  /** Incrementa a ogni apertura/disconnect: scarta le aperture asincrone superate. */
  private openGeneration = 0
  private handlers: Map<string, Set<IWebSocketManagerHandler>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private readonly maxReconnectDelay = 30000
  private shouldReconnect = false
  /** Codice di chiusura inviato dal server per token mancante, non valido o scaduto: inutile riconnettersi con lo stesso token. */
  private static readonly CLOSE_UNAUTHORIZED = 4401
  /** Il backend chiude con 4403 quando cambia il ruolo superuser: riconnettere subito, stesso token. */
  private static readonly CLOSE_ROLE_CHANGED = 4403
  /**
   * Tentativi consecutivi di apertura falliti prima di rinunciare, se la connessione non si è MAI aperta.
   * Un handshake rifiutato (es. 403 perché il backend non ha gli eventi attivi) per il browser è solo una
   * chiusura 1006 senza `open`: riprovare all'infinito non servirebbe. Dopo la prima apertura riuscita si
   * riprova sempre (il backend può essere temporaneamente irraggiungibile).
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

  /** true se la connessione è aperta, in apertura o in riconnessione (false dopo disconnect, 4401 o troppi fallimenti). */
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
      // `ping` non ha `data` né `timestamp`: si controlla sempre `type` prima di leggere `data`
      if (!msg || typeof msg.type !== 'string' || msg.type === 'ping') return
      this.handlers.get(msg.type)?.forEach(h => h.onMessage?.(msg.data))
    }
  }

  /** Gestisce la chiusura (o il fallimento di apertura) con le regole di riconnessione. */
  private _handleClose(code: number) {
    this.handlers.forEach(set => set.forEach(h => h.onClose?.(code)))
    if (code === WebSocketManager.CLOSE_ROLE_CHANGED && this.shouldReconnect) {
      // non è un errore: niente backoff né conteggio dei fallimenti (salvo 4403 ravvicinati: evita un loop)
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
      // chiusura volontaria: nessun evento dal vecchio socket (può arrivare dopo un nuovo connect)
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
