import { describe, expect, it, vi } from 'vitest'
import {
  listSettingsActions,
  mapLegacyScript,
  registerSettingsActions,
  resetSettingsWarnings,
  resolveSettingsAction,
  resolveSettingsActions,
} from '../src/helpers/actions'

function makeDeps() {
  return { Dark: { set: vi.fn(), toggle: vi.fn() }, Notify: { create: vi.fn() } }
}

describe('mapLegacyScript', () => {
  it('recognises the two legacy forms', () => {
    expect(mapLegacyScript('() => $q.dark.toggle()')).toBe('darkToggle')
    expect(mapLegacyScript("(newValue) => Dark.set(newValue === 'dark')")).toBe('darkSetWhenEquals:dark')
    expect(mapLegacyScript('() => alert(1)')).toBeNull()
  })
})

describe('resolveSettingsAction', () => {
  it('runs the default actions', () => {
    const deps = makeDeps()
    resolveSettingsAction('darkToggle', { deps })?.()
    expect(deps.Dark.toggle).toHaveBeenCalled()
    resolveSettingsAction("(v) => Dark.set(v === 'dark')", { deps })?.('dark')
    expect(deps.Dark.set).toHaveBeenLastCalledWith(true)
    resolveSettingsAction('darkSet', { deps })?.('light')
    expect(deps.Dark.set).toHaveBeenLastCalledWith(false)
    resolveSettingsAction('notify:Hello', { deps })?.()
    expect(deps.Notify.create).toHaveBeenCalledWith({ message: 'Hello' })
  })
  it('runs the actions registered by the app', () => {
    const fn = vi.fn()
    registerSettingsActions({ refreshMenu: fn })
    resolveSettingsAction('refreshMenu:x', { deps: makeDeps() })?.(42)
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ arg: 'x' }), 42)
    expect(listSettingsActions()).toContain('refreshMenu')
  })
  it('rejects scripts if allowScriptStrings is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const g = globalThis as Record<string, unknown>
    g.__pwned = false
    expect(resolveSettingsAction('() => (globalThis.__pwned = true)', { deps: makeDeps() })).toBeNull()
    expect(g.__pwned).toBe(false)
    expect(resolveSettingsAction('toString', { deps: makeDeps() })).toBeNull()
    warn.mockRestore()
  })
  it('runs scripts only with allowScriptStrings', () => {
    const h = resolveSettingsAction('(x) => x * 2', { deps: makeDeps(), allowScriptStrings: true })
    expect(h?.(4)).toBe(8)
  })
  it('warns (once) when it runs a script', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const opts = { deps: makeDeps(), allowScriptStrings: true }
    resolveSettingsAction('(x) => x + 1', opts)
    resolveSettingsAction('(x) => x + 1', opts)
    expect(warn.mock.calls.filter(c => String(c[0]).includes('new Function'))).toHaveLength(1)
    warn.mockRestore()
  })
  it('resolveSettingsActions discards unresolvable specs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const out = resolveSettingsActions({ a: 'darkToggle', b: 'nope()' }, { deps: makeDeps() })
    expect(Object.keys(out)).toEqual(['a'])
    warn.mockRestore()
  })
})

describe('object format { action, args }', () => {
  it('runs the default actions with args as object, array or single value', () => {
    const deps = makeDeps()
    resolveSettingsAction({ action: 'darkSet', args: { mode: 'dark' } }, { deps })?.()
    expect(deps.Dark.set).toHaveBeenLastCalledWith(true)
    resolveSettingsAction({ action: 'darkSet', args: ['light'] }, { deps })?.()
    expect(deps.Dark.set).toHaveBeenLastCalledWith(false)
    resolveSettingsAction({ action: 'darkSet', args: 'auto' }, { deps })?.()
    expect(deps.Dark.set).toHaveBeenLastCalledWith('auto')
    resolveSettingsAction({ action: 'darkSet', args: {} }, { deps })?.('dark')
    expect(deps.Dark.set).toHaveBeenLastCalledWith(true)
    resolveSettingsAction({ action: 'darkToggle' }, { deps })?.()
    expect(deps.Dark.toggle).toHaveBeenCalled()
    resolveSettingsAction({ action: 'notify', args: { message: 'Hello' } }, { deps })?.()
    expect(deps.Notify.create).toHaveBeenCalledWith({ message: 'Hello' })
    resolveSettingsAction({ action: 'darkSetWhenEquals', args: { value: 'night' } }, { deps })?.('night')
    expect(deps.Dark.set).toHaveBeenLastCalledWith(true)
  })
  it('passes args/params/arg to registered actions', () => {
    const fn = vi.fn()
    registerSettingsActions({ objAction: fn })
    resolveSettingsAction({ action: 'objAction', args: { from_value: true, n: 1 } }, { deps: makeDeps() })?.('v')
    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({ args: [{ from_value: true, n: 1 }], params: { from_value: true, n: 1 } }),
      'v',
    )
    resolveSettingsAction({ action: 'objAction', args: [7, 'x'] }, { deps: makeDeps() })?.()
    expect(fn).toHaveBeenLastCalledWith(expect.objectContaining({ arg: '7', args: [7, 'x'], params: {} }))
  })
  it('never runs code for object forms and warns only once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    resetSettingsWarnings()
    const opts = { deps: makeDeps(), allowScriptStrings: true }
    expect(resolveSettingsAction({ action: '() => 1' }, opts)).toBeNull()
    expect(resolveSettingsAction({ action: '() => 1' }, opts)).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
  it('an unknown format produces a warning (once) instead of vanishing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    resetSettingsWarnings()
    const map = { a: 42, b: { nope: true }, c: 42 } as never
    expect(resolveSettingsActions(map, { deps: makeDeps() })).toEqual({})
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })
  it('resolveSettingsActions accepts strings and objects together', () => {
    const deps = makeDeps()
    const out = resolveSettingsActions(
      { 'update:modelValue': { action: 'darkSet', args: {} }, other: 'darkToggle' },
      { deps },
    )
    expect(Object.keys(out)).toEqual(['update:modelValue', 'other'])
    out['update:modelValue']?.(false)
    expect(deps.Dark.set).toHaveBeenLastCalledWith(false)
  })
})
