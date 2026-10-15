import { describe, expect, it, vi } from 'vitest'
import { resetSettingsWarnings } from '../src/helpers/actions'
import { findWatchedField, resolveWatchTargets, toCamelCase } from '../src/helpers/watch'
import type { ISettingsSchemaResponse } from '../src/types/settings-manager'

const schema: ISettingsSchemaResponse = {
  preferences: {
    title: 'P',
    icon: null,
    route: null,
    fields: {
      theme: { component: 'select' },
      mode: { component: 'toggle', watch: { theme: { action: 'applyTheme', args: { mode: 'dark' } } } },
      legacy: { component: 'toggle', events: { 'update:modelValue': 'darkToggle' }, watch: true },
      cross: { component: 'toggle', watch: { 'audit.disableActivityLog': 'darkToggle' } },
      snake: { component: 'toggle', watch: { disable_x: 'darkToggle' } },
      disableX: { component: 'toggle' },
      orphan: { component: 'toggle', watch: { missing: 'darkToggle' } },
    },
  },
  audit: { title: 'A', icon: null, route: null, fields: { disableActivityLog: { component: 'toggle' } } },
}

describe('toCamelCase', () => {
  it('converts snake_case', () => {
    expect(toCamelCase('disable_activity_log')).toBe('disableActivityLog')
    expect(toCamelCase('theme')).toBe('theme')
  })
})

describe('findWatchedField', () => {
  it('resolves in the same section, with explicit section and in snake_case', () => {
    expect(findWatchedField(schema, 'preferences', 'theme')).toEqual({ section: 'preferences', field: 'theme' })
    expect(findWatchedField(schema, 'preferences', 'audit.disable_activity_log')).toEqual({
      section: 'audit',
      field: 'disableActivityLog',
    })
    expect(findWatchedField(schema, 'preferences', 'nope')).toBeNull()
  })
})

describe('resolveWatchTargets', () => {
  it('watches the field named by the key (backend semantics), not the one declaring the watch', () => {
    expect(resolveWatchTargets(schema, 'preferences', 'mode')).toEqual([
      { section: 'preferences', field: 'theme', spec: { action: 'applyTheme', args: { mode: 'dark' } } },
    ])
    expect(resolveWatchTargets(schema, 'preferences', 'cross')[0]).toMatchObject({ section: 'audit', field: 'disableActivityLog' })
    expect(resolveWatchTargets(schema, 'preferences', 'snake')[0]).toMatchObject({ field: 'disableX' })
  })
  it('watch: true reuses the events on the field itself', () => {
    expect(resolveWatchTargets(schema, 'preferences', 'legacy')).toEqual([
      { section: 'preferences', field: 'legacy', spec: 'darkToggle' },
    ])
  })
  it('without watch registers nothing; unknown key falls back to the field with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    resetSettingsWarnings()
    expect(resolveWatchTargets(schema, 'preferences', 'theme')).toEqual([])
    expect(resolveWatchTargets(schema, 'preferences', 'orphan')[0]).toMatchObject({ field: 'orphan' })
    resolveWatchTargets(schema, 'preferences', 'orphan')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
