import { mdiAccountCircleOutline } from '@quasar/extras/mdi-v7'
import { describe, expect, it, vi } from 'vitest'
import getMenuItemDefault, { getMenuItem } from '../src/menu'

// il package i18n importa quasar (richiede `window`): nei test non serve
vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, collectLocales: () => ({}) }))

describe('menu: voce Profilo', () => {
  it('restituisce la voce con testi tradotti, icona, route e ordine', () => {
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

  it('rispetta config.auth.menu.showProfile', () => {
    const t = (key: string): string => key
    expect(getMenuItem({ t, config: { auth: { menu: { showProfile: false } } } }).visible).toBe(false)
    expect(getMenuItem({ t, config: { auth: { menu: { showProfile: true } } } }).visible).toBe(true)
  })

  it('è anche il default export del modulo', () => {
    expect(getMenuItemDefault).toBe(getMenuItem)
  })
})
