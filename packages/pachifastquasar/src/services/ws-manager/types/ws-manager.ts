export interface IWebSocketManagerHandler<T = unknown> {
  onOpen?: () => void
  /** `code` is the WebSocket close code (4401 = invalid or expired token). */
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
