import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSubmitGuard } from '../../src/dialog/utils/submit-guard'

describe('createSubmitGuard', () => {
  afterEach(() => { vi.useRealTimers() })

  it('ignores re-entry until leave is called', () => {
    const g = createSubmitGuard()
    expect(g.enter()).toBe(true)
    expect(g.busy).toBe(true)
    expect(g.enter()).toBe(false)
    g.leave()
    g.leave()
    expect(g.busy).toBe(false)
    expect(g.enter()).toBe(true)
  })

  it('releases itself after the timeout', () => {
    vi.useFakeTimers()
    const g = createSubmitGuard(1000)
    g.enter()
    vi.advanceTimersByTime(999)
    expect(g.enter()).toBe(false)
    vi.advanceTimersByTime(2)
    expect(g.enter()).toBe(true)
  })
})
