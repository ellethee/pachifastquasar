import { describe, expect, it } from 'vitest'
import { collectApplyMap } from '../src/helpers/apply'
import type { ISettingsSchemaResponse } from '../src/types/settings-manager'

const field = (extra: Record<string, unknown> = {}) => ({ component: 'select', ...extra })

describe('collectApplyMap', () => {
  it('legge `apply` dallo schema', () => {
    const schema: ISettingsSchemaResponse = {
      appearance: { title: 'A', icon: null, route: null, fields: { theme: field({ apply: 'theme' }), custom: field({ apply: 'myApplier' }), plain: field() } },
    }
    expect(collectApplyMap(schema)).toEqual({
      'appearance.theme': 'theme',
      'appearance.custom': 'myApplier',
    })
  })

  it('usa i default dei campi standard se `apply` manca (vecchio backend)', () => {
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

  it('`apply: null` disattiva anche il default', () => {
    const schema: ISettingsSchemaResponse = {
      appearance: { title: 'A', icon: null, route: null, fields: { theme: field({ apply: null }), accent: field({ apply: '' }) } },
    }
    expect(collectApplyMap(schema)).toEqual({})
  })

  it('gestisce sezioni senza campi', () => {
    expect(collectApplyMap({ x: { title: 'X', icon: null, route: null } as never })).toEqual({})
  })
})
