import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocketManager } from 'src/services/ws-manager/ws-manager'

/** Fake WebSocket: records the created instances and allows simulating events. */
class FakeSocket {
  static instances: FakeSocket[] = []
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 3
  readyState = FakeSocket.CONNECTING
  onopen: (() => void) | null = null
  onclose: ((e: { code: number }) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  constructor(public url: string) {
    FakeSocket.instances.push(this)
  }
  close() { this.readyState = FakeSocket.CLOSED }
  send() {}
  open() { this.readyState = FakeSocket.OPEN; this.onopen?.() }
  fail(code: number) { this.readyState = FakeSocket.CLOSED; this.onclose?.({ code }) }
}

describe('WebSocketManager', () => {
  beforeEach(() => {
    FakeSocket.instances = []
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', FakeSocket)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('4401: does not reconnect and notifies the close code', () => {
    const onClose = vi.fn()
    const m = new WebSocketManager('ws://x')
    m.addHandler('__conn__', { onClose })
    m.connect()
    FakeSocket.instances[0]!.open()
    FakeSocket.instances[0]!.fail(4401)
    expect(onClose).toHaveBeenCalledWith(4401)
    expect(m.isActive).toBe(false)
    vi.advanceTimersByTime(60_000)
    expect(FakeSocket.instances).toHaveLength(1)
  })

  it('4403: reconnects immediately, without backoff', () => {
    const m = new WebSocketManager('ws://x')
    m.connect()
    FakeSocket.instances[0]!.open()
    FakeSocket.instances[0]!.fail(4403)
    expect(FakeSocket.instances).toHaveLength(2)
    expect(m.isActive).toBe(true)
  })

  it('4403 in quick succession: the second goes through backoff (no loop)', () => {
    const m = new WebSocketManager('ws://x')
    m.connect()
    FakeSocket.instances[0]!.open()
    FakeSocket.instances[0]!.fail(4403)
    expect(FakeSocket.instances).toHaveLength(2)
    FakeSocket.instances[1]!.open()
    FakeSocket.instances[1]!.fail(4403)
    // within 1s of the previous one: no immediate reopening, only the reconnection timer
    expect(FakeSocket.instances).toHaveLength(2)
    vi.advanceTimersByTime(1000)
    expect(FakeSocket.instances).toHaveLength(3)
  })

  it('4403 spaced more than 1s apart: always reconnects immediately', () => {
    const m = new WebSocketManager('ws://x')
    m.connect()
    FakeSocket.instances[0]!.open()
    FakeSocket.instances[0]!.fail(4403)
    vi.advanceTimersByTime(1500)
    FakeSocket.instances[1]!.open()
    FakeSocket.instances[1]!.fail(4403)
    expect(FakeSocket.instances).toHaveLength(3)
  })

  it('exponential backoff capped at 30s after the first open', () => {
    const m = new WebSocketManager('ws://x')
    m.connect()
    FakeSocket.instances[0]!.open()
    const delays = [1000, 2000, 4000, 8000, 16000, 30000, 30000]
    for (const [i, d] of delays.entries()) {
      FakeSocket.instances[i]!.fail(1006)
      vi.advanceTimersByTime(d - 1)
      expect(FakeSocket.instances).toHaveLength(i + 1)
      vi.advanceTimersByTime(1)
      expect(FakeSocket.instances).toHaveLength(i + 2)
    }
  })

  it('gives up after 5 initial failures without ever opening', () => {
    const m = new WebSocketManager('ws://x')
    m.connect()
    for (let i = 0; i < 5; i++) {
      FakeSocket.instances[i]!.fail(1006)
      vi.advanceTimersByTime(60_000)
    }
    expect(FakeSocket.instances).toHaveLength(5)
    expect(m.isActive).toBe(false)
  })

  it('the URL getter is recomputed on every reconnection', () => {
    let token = 'old'
    const m = new WebSocketManager(() => `ws://x?token=${token}`)
    m.connect()
    FakeSocket.instances[0]!.open()
    token = 'new'
    FakeSocket.instances[0]!.fail(1006)
    vi.advanceTimersByTime(1000)
    expect(FakeSocket.instances[1]!.url).toBe('ws://x?token=new')
  })

  it('disconnect stops reconnection and ignores events from the old socket', () => {
    const onClose = vi.fn()
    const m = new WebSocketManager('ws://x')
    m.addHandler('__conn__', { onClose })
    m.connect()
    const s = FakeSocket.instances[0]!
    s.open()
    m.disconnect()
    expect(s.onclose).toBeNull()
    vi.advanceTimersByTime(60_000)
    expect(FakeSocket.instances).toHaveLength(1)
    expect(m.isActive).toBe(false)
  })

  it('dispatches messages by type and ignores ping and invalid JSON', () => {
    const onMessage = vi.fn()
    const m = new WebSocketManager('ws://x')
    m.addHandler('activity', { onMessage })
    m.connect()
    const s = FakeSocket.instances[0]!
    s.open()
    s.onmessage?.({ data: JSON.stringify({ type: 'activity', data: { a: 1 } }) })
    s.onmessage?.({ data: JSON.stringify({ type: 'ping' }) })
    s.onmessage?.({ data: 'not json' })
    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage).toHaveBeenCalledWith({ a: 1 })
  })

  it('async URL (ticket): new URL on every reconnection', async () => {
    let n = 0
    const m = new WebSocketManager(() => Promise.resolve(`ws://x?ticket=t${++n}`))
    m.connect()
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeSocket.instances[0]!.url).toBe('ws://x?ticket=t1')
    FakeSocket.instances[0]!.open()
    FakeSocket.instances[0]!.fail(1006)
    await vi.advanceTimersByTimeAsync(1000)
    expect(FakeSocket.instances[1]!.url).toBe('ws://x?ticket=t2')
  })

  it('async URL: error with closeCode 4401 does not reconnect and notifies', async () => {
    const onClose = vi.fn()
    const m = new WebSocketManager(() => Promise.reject(Object.assign(new Error('401'), { closeCode: 4401 })))
    m.addHandler('__conn__', { onClose })
    m.connect()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(onClose).toHaveBeenCalledWith(4401)
    expect(FakeSocket.instances).toHaveLength(0)
    expect(m.isActive).toBe(false)
  })

  it('async URL: disconnect before the response does not open the socket', async () => {
    let resolve!: (url: string) => void
    const m = new WebSocketManager(() => new Promise<string>((r) => { resolve = r }))
    m.connect()
    m.disconnect()
    resolve('ws://x?ticket=late')
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeSocket.instances).toHaveLength(0)
  })

  it('async URL: generic error retries with backoff', async () => {
    const m = new WebSocketManager(() => Promise.reject(new Error('network')))
    m.connect()
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    expect(m.isActive).toBe(true)
  })
})
