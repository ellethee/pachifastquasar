import { describe, expect, it } from 'vitest'
import { collectApplyMap } from '../src/helpers/apply'
import type { ISettingsSchemaResponse } from '../src/types/settings-manager'

const field = (extra: Record<string, unknown> = {}) => ({ component: 'select', ...extra })

describe('collectApplyMap', () => {
  it('reads `apply` from the schema', () => {
    const schema: ISettingsSchemaResponse = {
      appearance: { title: 'A', icon: null, route: null, fields: { theme: field({ apply: 'theme' }), custom: field({ apply: 'myApplier' }), plain: field() } },
    }
    expect(collectApplyMap(schema)).toEqual({
      'appearance.theme': 'theme',
      'appearance.custom': 'myApplier',
    })
  })

  it('uses the standard field defaults if `apply` is missing (old backend)', () => {
    const schema: ISettingsSchemaResponse = {
      appearance: { title: 'A', icon: null, route: null, fields: { accent: field(), density: field() } },
      preferences: { title: 'P', icon: null, route: null, fields: { theme: field(), locale: field(), other: field() } },
    }
    expect(collectApplyMap(schema)).toEqual({
      'appearance.accent': 'accent',
      'appearance.density': 'density',
      'preferences.theme': 'theme',
      'preferences.locale': 'locale',
    })
  })

  it('`apply: null` also disables the default', () => {
    const schema: ISettingsSchemaResponse = {
      appearance: { title: 'A', icon: null, route: null, fields: { theme: field({ apply: null }), accent: field({ apply: '' }) } },
    }
    expect(collectApplyMap(schema)).toEqual({})
  })

  it('handles sections without fields', () => {
    expect(collectApplyMap({ x: { title: 'X', icon: null, route: null } as never })).toEqual({})
  })
})
