import { beforeEach, describe, expect, it, vi } from 'vitest'

const notify = vi.fn()
vi.mock('quasar', () => ({ Dialog: { create: vi.fn() }, Notify: { create: vi.fn() } }))
vi.mock('src/helpers/quasar-instance', () => ({ getPachiQuasar: () => ({ notify }) }))
vi.mock('@ilpachi/pachi-i18n', () => ({
  getPachiI18n: () => ({ global: { te: () => false } }),
  pachiT: (key: string) => `T(${key})`
}))

const { toastMessage, plainDetail } = await import('src/helpers/errormessages-helper')
const { setPachiConfig } = await import('src/core/config')
const err = {} as never

describe('toastMessage', () => {
  beforeEach(() => notify.mockReset())

  it('uses the default position and duration', () => {
    setPachiConfig({})
    void toastMessage(err, 'T', '<b>x</b>')
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'top-right', timeout: 5000, caption: '&lt;b&gt;x&lt;/b&gt;' })
    )
  })
  it('follows http.toast from the configuration (0 = sticky)', () => {
    setPachiConfig({ http: { toast: { position: 'bottom', timeout: 0 } } })
    void toastMessage(err, 'T', 'x')
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ position: 'bottom', timeout: 0 }))
  })
})

describe('plainDetail', () => {
  it('joins validation items, passes strings and falls back to the generic text', () => {
    const base = { type: 'x', loc: [], input: '' }
    expect(plainDetail([{ ...base, msg: 'a' }, { ...base, msg: 'b' }])).toBe('a · b')
    expect(plainDetail('plain')).toBe('plain')
    expect(plainDetail(undefined)).toBe('T(errors.http.generic)')
    expect(plainDetail(undefined, true)).toBe('T(errors.http.tooManyRequests)')
  })
})
