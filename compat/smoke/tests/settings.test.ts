import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('quasar', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  Notify: { create: vi.fn() },
  Dark: { isActive: false, set: vi.fn(), toggle: vi.fn() },
}))
vi.mock('@ilpachi/pachi-i18n', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  pachiT: (k: string) => k,
}))

import { SettingsManager, setPachiSettingsOptions, resolveFieldDefault } from '@ilpachi/fastquasar-settings'
import { failure, http, login, raw } from './helpers'

let token = ''

describe('user settings (docs di fastquasar-settings)', () => {
  beforeAll(async () => {
    token = (await login('admin')).access_token
    setActivePinia(createPinia())
    setPachiSettingsOptions({
      isAuthenticated: () => true,
      getUser: () => ({ username: 'admin' }),
      getHttp: () => http('/auth', token),
    })
  })

  it('GET /user/settings: valori per categoria, chiavi camelCase, nessun buco', async () => {
    const res = await raw('GET', '/auth/user/settings', { token })
    expect(res.body.success).toBe(true)
    const d = res.body.data
    expect(Object.keys(d.appearance).sort()).toEqual(['accent', 'density', 'fontScale', 'reduceMotion', 'theme'])
    expect(d.preferences).toHaveProperty('tablePageSize')
    expect(d.preferences).toHaveProperty('locale')
  })

  it('GET /user/settings/schema: component, apply, default, opzioni dei select', async () => {
    const schema = (await raw('GET', '/auth/user/settings/schema', { token })).body.data
    const theme = schema.appearance.fields.theme
    expect(theme.component).toBe('select')
    expect(theme.apply).toBe('theme')
    expect(theme.default).toBe('auto')
    expect(theme.properties.options.map((o: any) => o.value).sort()).toEqual(['auto', 'dark', 'light'])
    expect(theme.properties.emitValue).toBe(true)
    expect(theme.optionKeys.dark).toBe('settings.appearance.theme.options.dark')
    expect(schema.appearance.fields.accent.apply).toBe('accent')
    expect(schema.appearance.fields.reduceMotion.default).toBe(false)
    expect(schema.preferences.fields.locale.apply).toBe('locale')
    expect(schema.preferences.fields.locale.default).toBeNull()
    expect(schema.preferences.fields.tablePageSize.default).toBe(25)
    expect(schema.preferences.fields.tablePageSize.properties).toMatchObject({ min: 10, max: 100 })
    expect(schema.appearance).toHaveProperty('titleKey')
  })

  it('SettingsManager.loadSettings (dist del package) carica valori, schema e default', async () => {
    const sm = SettingsManager.getInstance()
    const values = await sm.loadSettings()
    expect(values.appearance?.theme).toBeDefined()
    expect(sm.schema.appearance.fields.theme.apply).toBe('theme')
    expect(resolveFieldDefault(sm.schema, 'appearance', 'accent').value).toBe('teal')
    expect(sm.getDefault('preferences', 'tablePageSize')).toMatchObject({ found: true, value: 25 })
  })

  it('SettingsManager.set salva con PUT (debounce) e il valore e\' persistito', async () => {
    const sm = SettingsManager.getInstance()
    await sm.loadSettings()
    sm.set('preferences', 'tablePageSize', 50)
    await new Promise((r) => setTimeout(r, 1200))
    const saved = (await raw('GET', '/auth/user/settings', { token })).body.data
    expect(saved.preferences.tablePageSize).toBe(50)
    sm.set('preferences', 'tablePageSize', 25)
    await new Promise((r) => setTimeout(r, 1200))
  })

  it('PUT valido: 200 e valori aggiornati', async () => {
    const res = await raw('PUT', '/auth/user/settings/appearance/accent', { token, json: { value: 'indigo' } })
    expect(res.status).toBe(200)
    expect(res.body.data.appearance.accent).toBe('indigo')
    await raw('PUT', '/auth/user/settings/appearance/accent', { token, json: { value: 'teal' } })
  })

  it('PUT accetta anche il nome snake_case', async () => {
    const res = await raw('PUT', '/auth/user/settings/appearance/reduce_motion', { token, json: { value: true } })
    expect(res.status).toBe(200)
    expect(res.body.data.appearance.reduceMotion).toBe(true)
    await raw('PUT', '/auth/user/settings/appearance/reduceMotion', { token, json: { value: false } })
  })

  it('PUT invalido: 422 user.settings_value_invalid, loc body.value, params category/key', async () => {
    const f = await failure(() => http('/auth', token).Put('/user/settings/appearance/theme', { value: 'viola' }))
    expect(f.status).toBe(422)
    const d = f.body.detail[0]
    expect(d.code).toBe('user.settings_value_invalid')
    expect(d.loc).toEqual(['body', 'value'])
    expect(d.params).toEqual({ category: 'appearance', key: 'theme' })
  })

  it('PUT fuori range (tablePageSize 500) e null per locale', async () => {
    expect((await raw('PUT', '/auth/user/settings/preferences/tablePageSize', { token, json: { value: 500 } })).status).toBe(422)
    expect((await raw('PUT', '/auth/user/settings/preferences/locale', { token, json: { value: null } })).status).toBe(200)
  })

  it('PATCH /user/settings (opzionale): tutto o niente, stesso 422', async () => {
    const ok = await raw('PATCH', '/auth/user/settings', { token, json: { appearance: { theme: 'dark' } } })
    expect(ok.status).toBe(200)
    expect(ok.body.data.appearance.theme).toBe('dark')
    const bad = await raw('PATCH', '/auth/user/settings', { token, json: { appearance: { theme: 'light', accent: 'nope' } } })
    expect(bad.status).toBe(422)
    expect(bad.body.detail[0].code).toBe('user.settings_value_invalid')
    const after = (await raw('GET', '/auth/user/settings', { token })).body.data
    expect(after.appearance.theme).toBe('dark')
    await raw('PATCH', '/auth/user/settings', { token, json: { appearance: { theme: 'auto' } } })
  })
})
