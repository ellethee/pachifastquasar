import { mdiCog } from '@quasar/extras/mdi-v7'
import { describe, expect, it, vi } from 'vitest'
import getMenuItemDefault, { getMenuItem } from '../src/menu'

// the i18n package imports quasar (requires `window`): not needed in tests
vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, collectLocales: () => ({}) }))

describe('menu: Settings entry', () => {
  it('returns the entry with translated texts, icon, route and order', () => {
    const t = vi.fn((key: string) => `tr:${key}`)
    const item = getMenuItem({ t })
    expect(item).toEqual({
      label: 'tr:pachiSettings.menuLabel',
      caption: 'tr:pachiSettings.menuCaption',
      icon: mdiCog,
      to: '/user/settings',
      order: 20,
      visible: true,
    })
    expect(t).toHaveBeenCalledWith('pachiSettings.menuLabel')
    expect(t).toHaveBeenCalledWith('pachiSettings.menuCaption')
  })

  it('honours config.auth.menu.showSettings', () => {
    const t = (key: string): string => key
    expect(getMenuItem({ t, config: { auth: { menu: { showSettings: false } } } }).visible).toBe(false)
    expect(getMenuItem({ t, config: { auth: { menu: { showSettings: true } } } }).visible).toBe(true)
  })

  it('is also the module default export', () => {
    expect(getMenuItemDefault).toBe(getMenuItem)
  })
})
