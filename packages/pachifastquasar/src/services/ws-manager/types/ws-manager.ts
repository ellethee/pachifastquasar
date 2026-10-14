export interface IWebSocketManagerHandler<T = unknown> {
  onOpen?: () => void
  /** `code` è il close code del WebSocket (4401 = token non valido o scaduto). */
  onClose?: (code?: number) => void
  onError?: (error: Event) => void
  onMessage?: (data: T) => void
}

export interface IWebSocketManagerHandlers {
  [eventType: string]: IWebSocketManagerHandler
}

export interface IWebSocketManagerMessage<T = unknown> {
  type: string
  timestamp?: string
  data?: T
}
