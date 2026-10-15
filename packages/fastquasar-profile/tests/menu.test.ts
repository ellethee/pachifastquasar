import { mdiAccountCircleOutline } from '@quasar/extras/mdi-v7'
import { describe, expect, it, vi } from 'vitest'
import getMenuItemDefault, { getMenuItem } from '../src/menu'

// the i18n package imports quasar (requires `window`): not needed in tests
vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, collectLocales: () => ({}) }))

describe('menu: Profile item', () => {
  it('returns the item with translated texts, icon, route and order', () => {
    const t = vi.fn((key: string) => `tr:${key}`)
    const item = getMenuItem({ t })
    expect(item).toEqual({
      label: 'tr:pachiProfile.menuLabel',
      caption: 'tr:pachiProfile.menuCaption',
      icon: mdiAccountCircleOutline,
      to: '/user/profile',
      order: 10,
      visible: true,
    })
    expect(t).toHaveBeenCalledWith('pachiProfile.menuLabel')
    expect(t).toHaveBeenCalledWith('pachiProfile.menuCaption')
  })

  it('honors config.auth.menu.showProfile', () => {
    const t = (key: string): string => key
    expect(getMenuItem({ t, config: { auth: { menu: { showProfile: false } } } }).visible).toBe(false)
    expect(getMenuItem({ t, config: { auth: { menu: { showProfile: true } } } }).visible).toBe(true)
  })

  it('is also the module default export', () => {
    expect(getMenuItemDefault).toBe(getMenuItem)
  })
})
