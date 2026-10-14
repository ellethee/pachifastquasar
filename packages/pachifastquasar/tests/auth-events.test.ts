import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PACHI_AUTH_CHANGED_EVENT,
  PACHI_THEME_CHANGED_EVENT,
  notifyPachiAuthChanged,
  notifyPachiThemeChanged,
  resetPachiAuthNotification
} from 'src/helpers/auth-events'

describe('eventi auth/tema per i package', () => {
  const dispatched: CustomEvent[] = []

  beforeEach(() => {
    dispatched.length = 0
    resetPachiAuthNotification()
    vi.stubGlobal('window', { dispatchEvent: (e: CustomEvent) => dispatched.push(e) })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('emette al login con id e username', () => {
    notifyPachiAuthChanged({ id: 'u1', username: 'ann' })
    expect(dispatched).toHaveLength(1)
    expect(dispatched[0]!.type).toBe(PACHI_AUTH_CHANGED_EVENT)
    expect(dispatched[0]!.detail).toEqual({ authenticated: true, userId: 'u1', username: 'ann' })
  })

  it('non ripete lo stesso utente (refresh dei dati)', () => {
    notifyPachiAuthChanged({ id: 'u1', username: 'ann' })
    notifyPachiAuthChanged({ id: 'u1', username: 'ann' })
    expect(dispatched).toHaveLength(1)
  })

  it('con force emette comunque', () => {
    notifyPachiAuthChanged({ id: 'u1', username: 'ann' })
    notifyPachiAuthChanged({ id: 'u1', username: 'ann' }, true)
    expect(dispatched).toHaveLength(2)
  })

  it('emette al logout e al cambio utente', () => {
    notifyPachiAuthChanged({ id: 'u1', username: 'ann' })
    notifyPachiAuthChanged(null)
    notifyPachiAuthChanged({ id: 'u2', username: 'bob' })
    expect(dispatched.map((e) => e.detail.userId)).toEqual(['u1', null, 'u2'])
    expect(dispatched[1]!.detail.authenticated).toBe(false)
  })

  it('usa lo username se manca l\'id', () => {
    notifyPachiAuthChanged({ username: 'ann' })
    expect(dispatched[0]!.detail.userId).toBe('ann')
  })

  it('notifica il tema', () => {
    notifyPachiThemeChanged('light')
    expect(dispatched[0]!.type).toBe(PACHI_THEME_CHANGED_EVENT)
    expect(dispatched[0]!.detail).toEqual({ theme: 'light' })
  })

  it('è un no-op fuori dal browser', () => {
    vi.unstubAllGlobals()
    expect(() => notifyPachiAuthChanged({ id: 'x' })).not.toThrow()
  })
})
