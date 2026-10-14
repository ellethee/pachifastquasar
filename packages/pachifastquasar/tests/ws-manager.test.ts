import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocketManager } from 'src/services/ws-manager/ws-manager'

/** WebSocket finto: registra le istanze create e permette di simulare gli eventi. */
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

  it('4401: non riconnette e notifica il close code', () => {
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

  it('4403: riconnette subito, senza backoff', () => {
    const m = new WebSocketManager('ws://x')
    m.connect()
    FakeSocket.instances[0]!.open()
    FakeSocket.instances[0]!.fail(4403)
    expect(FakeSocket.instances).toHaveLength(2)
    expect(m.isActive).toBe(true)
  })

  it('4403 ravvicinati: il secondo passa dal backoff (niente loop)', () => {
    const m = new WebSocketManager('ws://x')
    m.connect()
    FakeSocket.instances[0]!.open()
    FakeSocket.instances[0]!.fail(4403)
    expect(FakeSocket.instances).toHaveLength(2)
    FakeSocket.instances[1]!.open()
    FakeSocket.instances[1]!.fail(4403)
    // entro 1s dal precedente: nessuna riapertura immediata, solo il timer di riconnessione
    expect(FakeSocket.instances).toHaveLength(2)
    vi.advanceTimersByTime(1000)
    expect(FakeSocket.instances).toHaveLength(3)
  })

  it('4403 distanziati di più di 1s: riconnette sempre subito', () => {
    const m = new WebSocketManager('ws://x')
    m.connect()
    FakeSocket.instances[0]!.open()
    FakeSocket.instances[0]!.fail(4403)
    vi.advanceTimersByTime(1500)
    FakeSocket.instances[1]!.open()
    FakeSocket.instances[1]!.fail(4403)
    expect(FakeSocket.instances).toHaveLength(3)
  })

  it('backoff esponenziale con tetto a 30s dopo la prima apertura', () => {
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

  it('rinuncia dopo 5 fallimenti iniziali senza mai aprire', () => {
    const m = new WebSocketManager('ws://x')
    m.connect()
    for (let i = 0; i < 5; i++) {
      FakeSocket.instances[i]!.fail(1006)
      vi.advanceTimersByTime(60_000)
    }
    expect(FakeSocket.instances).toHaveLength(5)
    expect(m.isActive).toBe(false)
  })

  it('l\'URL getter è ricalcolato a ogni riconnessione', () => {
    let token = 'old'
    const m = new WebSocketManager(() => `ws://x?token=${token}`)
    m.connect()
    FakeSocket.instances[0]!.open()
    token = 'new'
    FakeSocket.instances[0]!.fail(1006)
    vi.advanceTimersByTime(1000)
    expect(FakeSocket.instances[1]!.url).toBe('ws://x?token=new')
  })

  it('disconnect ferma la riconnessione e ignora gli eventi del vecchio socket', () => {
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

  it('smista i messaggi per tipo e ignora ping e JSON non valido', () => {
    const onMessage = vi.fn()
    const m = new WebSocketManager('ws://x')
    m.addHandler('activity', { onMessage })
    m.connect()
    const s = FakeSocket.instances[0]!
    s.open()
    s.onmessage?.({ data: JSON.stringify({ type: 'activity', data: { a: 1 } }) })
    s.onmessage?.({ data: JSON.stringify({ type: 'ping' }) })
    s.onmessage?.({ data: 'non json' })
    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage).toHaveBeenCalledWith({ a: 1 })
  })

  it('URL asincrono (ticket): nuovo URL a ogni riconnessione', async () => {
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

  it('URL asincrono: errore con closeCode 4401 non riconnette e notifica', async () => {
    const onClose = vi.fn()
    const m = new WebSocketManager(() => Promise.reject(Object.assign(new Error('401'), { closeCode: 4401 })))
    m.addHandler('__conn__', { onClose })
    m.connect()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(onClose).toHaveBeenCalledWith(4401)
    expect(FakeSocket.instances).toHaveLength(0)
    expect(m.isActive).toBe(false)
  })

  it('URL asincrono: disconnect prima della risposta non apre il socket', async () => {
    let resolve!: (url: string) => void
    const m = new WebSocketManager(() => new Promise<string>((r) => { resolve = r }))
    m.connect()
    m.disconnect()
    resolve('ws://x?ticket=late')
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeSocket.instances).toHaveLength(0)
  })

  it('URL asincrono: errore generico riprova con backoff', async () => {
    const m = new WebSocketManager(() => Promise.reject(new Error('rete')))
    m.connect()
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    expect(m.isActive).toBe(true)
  })
})
