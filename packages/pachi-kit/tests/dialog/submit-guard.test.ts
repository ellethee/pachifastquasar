import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSubmitGuard } from '../../src/dialog/utils/submit-guard'

describe('createSubmitGuard', () => {
  afterEach(() => { vi.useRealTimers() })

  it('ignora il rientro finche non viene chiamato leave', () => {
    const g = createSubmitGuard()
    expect(g.enter()).toBe(true)
    expect(g.busy).toBe(true)
    expect(g.enter()).toBe(false)
    g.leave()
    g.leave()
    expect(g.busy).toBe(false)
    expect(g.enter()).toBe(true)
  })

  it('si libera da sola dopo il timeout', () => {
    vi.useFakeTimers()
    const g = createSubmitGuard(1000)
    g.enter()
    vi.advanceTimersByTime(999)
    expect(g.enter()).toBe(false)
    vi.advanceTimersByTime(2)
    expect(g.enter()).toBe(true)
  })
})
