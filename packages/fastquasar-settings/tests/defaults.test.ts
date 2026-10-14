import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('quasar', () => ({ Notify: { create: vi.fn() }, Dark: { isActive: true, set: vi.fn(), toggle: vi.fn() } }))
vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, matchLocale: () => undefined, pachiT: (k: string) => k }))

import { FALLBACK_DEFAULTS, collectDefaults, resolveFieldDefault } from '../src/helpers/defaults'
import { registerSettingsApplier, resetSettingsAppliers } from '../src/services/appliers'
import { SettingsManager } from '../src/services/settings-manager'
import type { ISettingsSchemaResponse } from '../src/types/settings-manager'

const f = (extra: Record<string, unknown> = {}) => ({ component: 'select', ...extra })

describe('default dello schema', () => {
  it('usa `default` dello schema invece del fallback', () => {
    const schema: ISettingsSchemaResponse = {
      appearance: { title: 'A', icon: null, route: null, fields: { theme: f({ default: 'dark' }), reduceMotion: f({ default: true }) } },
    }
    expect(resolveFieldDefault(schema, 'appearance', 'theme')).toEqual({ found: true, value: 'dark' })
    expect(resolveFieldDefault(schema, 'appearance', 'reduceMotion')).toEqual({ found: true, value: true })
  })

  it('senza `default` usa il fallback (vecchi backend)', () => {
    const schema: ISettingsSchemaResponse = {
      appearance: { title: 'A', icon: null, route: null, fields: { theme: f(), accent: f(), custom: f() } },
    }
    expect(resolveFieldDefault(schema, 'appearance', 'theme').value).toBe(FALLBACK_DEFAULTS['appearance.theme'])
    expect(resolveFieldDefault(schema, 'appearance', 'accent').value).toBe('teal')
    expect(resolveFieldDefault(schema, 'appearance', 'custom')).toEqual({ found: false, value: undefined })
    expect(resolveFieldDefault(schema, 'appearance', 'missing').found).toBe(false)
  })

  it('`null` è un default valido e batte il fallback', () => {
    const schema: ISettingsSchemaResponse = {
      preferences: { title: 'P', icon: null, route: null, fields: { locale: f({ default: null }), timezone: f({ default: null }) } },
    }
    expect(resolveFieldDefault(schema, 'preferences', 'locale')).toEqual({ found: true, value: null })
    expect(collectDefaults(schema)).toEqual({ 'preferences.locale': null, 'preferences.timezone': null })
  })

  it('un `default` dello schema diverso dal fallback vince', () => {
    const schema: ISettingsSchemaResponse = {
      appearance: { title: 'A', icon: null, route: null, fields: { accent: f({ default: 'coral' }) } },
    }
    expect(collectDefaults(schema)).toEqual({ 'appearance.accent': 'coral' })
  })
})

describe('applier su reset', () => {
  it('resetSettingsAppliers passa il default dello schema (anche null)', () => {
    const seen: Array<[string, unknown, string]> = []
    const off1 = registerSettingsApplier('dfltA', (v, ctx) => { seen.push(['dfltA', v, ctx.source]) })
    const off2 = registerSettingsApplier('dfltB', (v, ctx) => { seen.push(['dfltB', v, ctx.source]) })
    resetSettingsAppliers({ dfltA: null })
    expect(seen).toContainEqual(['dfltA', null, 'reset'])
    expect(seen).toContainEqual(['dfltB', undefined, 'reset'])
    off1(); off2()
  })

  it('clearSettings passa ai default dello schema agli applier', () => {
    setActivePinia(createPinia())
    const seen: unknown[] = []
    const off = registerSettingsApplier('dfltC', (v, ctx) => { if (ctx.source === 'reset') seen.push(v) })
    const mgr = SettingsManager.getInstance() as unknown as Record<string, unknown>
    mgr.lastSchema = { s: { title: 'S', icon: null, route: null, fields: { c: f({ default: 'xx', apply: 'dfltC' }) } } }
    mgr.applyMap = { 's.c': 'dfltC' }
    SettingsManager.getInstance().clearSettings()
    expect(seen).toEqual(['xx'])
    off()
  })

  it('getDefault del manager legge lo schema', () => {
    const mgr = SettingsManager.getInstance() as unknown as Record<string, unknown>
    mgr.lastSchema = { appearance: { title: 'A', icon: null, route: null, fields: { theme: f({ default: 'light' }) } } }
    expect(SettingsManager.getInstance().getDefault('appearance', 'theme')).toEqual({ found: true, value: 'light' })
  })
})
