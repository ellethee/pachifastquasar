import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PACHI_CONFIG,
  getPachiConfig,
  definePachiConfig,
  mergePachiConfig,
  pachiConfigFromEnv,
  resolvePachiConfig,
  setPachiConfig
} from 'src/core/config'

describe('resolvePachiConfig', () => {
  it('senza input restituisce i default', () => {
    expect(resolvePachiConfig()).toEqual(DEFAULT_PACHI_CONFIG)
  })
  it('fa merge ricorsivo senza perdere i default', () => {
    const cfg = resolvePachiConfig({ app: { title: 'X' }, auth: { menu: { showHome: false } } })
    expect(cfg.app.title).toBe('X')
    expect(cfg.app.description).toBe(DEFAULT_PACHI_CONFIG.app.description)
    expect(cfg.auth.menu).toEqual({ showProfile: true, showSettings: true, showHome: false })
  })
  it('i valori undefined non sovrascrivono i default', () => {
    expect(resolvePachiConfig({ app: { title: undefined } as never }).app.title).toBe(
      DEFAULT_PACHI_CONFIG.app.title
    )
  })
  it('non fa merge dei componenti (oggetti con prototipo non semplice) e degli array', () => {
    class Comp {}
    const logo = new Comp() as never
    const cfg = resolvePachiConfig({ logo, menuItems: [{ label: 'a' }] })
    expect(cfg.logo).toBe(logo)
    expect(cfg.menuItems).toEqual([{ label: 'a' }])
  })
})

describe('setPachiConfig / getPachiConfig', () => {
  it('registra la config risolta', () => {
    const cfg = setPachiConfig({ auth: { enabled: false } })
    expect(getPachiConfig()).toBe(cfg)
    expect(getPachiConfig().auth.enabled).toBe(false)
    setPachiConfig()
    expect(getPachiConfig().auth.enabled).toBe(true)
  })
})

describe('pachiConfigFromEnv', () => {
  it('env vuoto = default del boilerplate', () => {
    expect(resolvePachiConfig(pachiConfigFromEnv({}))).toEqual(DEFAULT_PACHI_CONFIG)
  })
  it('QCLI_APP_LOGO_SIZE imposta app.logoSize; il default è 36px', () => {
    expect(resolvePachiConfig({}).app.logoSize).toBe('36px')
    expect(pachiConfigFromEnv({ QCLI_APP_LOGO_SIZE: '48px' })).toEqual({ app: { logoSize: '48px' } })
  })
  it('QCLI_APP_LOGO_OVERLAP: default false, true/false da env', () => {
    expect(resolvePachiConfig({}).app.logoOverlap).toBe(false)
    expect(pachiConfigFromEnv({ QCLI_APP_LOGO_OVERLAP: 'true' })).toEqual({ app: { logoOverlap: true } })
    expect(pachiConfigFromEnv({ QCLI_APP_LOGO_OVERLAP: 'false' })).toEqual({ app: { logoOverlap: false } })
  })
  it('contiene solo le variabili impostate (vuote = assenti)', () => {
    expect(pachiConfigFromEnv({})).toEqual({})
    expect(pachiConfigFromEnv({ QCLI_APP_TITLE: '', QCLI_APP_LOCALE: '  ' })).toEqual({})
    expect(pachiConfigFromEnv({ QCLI_APP_TITLE: 'X' })).toEqual({ app: { title: 'X' } })
  })
  it('legge le variabili QCLI_* e VITE_*', () => {
    const cfg = resolvePachiConfig(
      pachiConfigFromEnv({
        VITE_AUTH_ENABLED: 'false',
        QCLI_AUTH_STORAGE: 'session',
        QCLI_AUTH_MENU_PROFILE: 'false',
        QCLI_APP_TITLE: 'Mia App',
        QCLI_APP_LOCALE: 'it',
        QCLI_APP_AUTO_DASHBOARD: 'false',
        QCLI_APP_HIDE_HUB_HEADER: 'true',
        QCLI_APP_GRAVATAR: 'true',
        VITE_APP_HOVER_EFFECTS: 'false'
      })
    )
    expect(cfg.auth.enabled).toBe(false)
    expect(cfg.auth.storage).toBe('session')
    expect(cfg.auth.menu.showProfile).toBe(false)
    expect(cfg.auth.menu.showSettings).toBe(true)
    expect(cfg.app.title).toBe('Mia App')
    expect(cfg.app.locale).toBe('it')
    expect(cfg.app.autoDashboard).toBe(false)
    expect(cfg.app.hideHubHeader).toBe(true)
    expect(cfg.app.gravatar).toBe(true)
    expect(DEFAULT_PACHI_CONFIG.app.gravatar).toBe(false)
    expect(cfg.app.hoverEffectsEnabled).toBe(false)
  })
  it('QCLI_HTTP_ENVELOPE: default true, false solo se impostata a false, assente se non impostata', () => {
    expect(DEFAULT_PACHI_CONFIG.http.envelope).toBe(true)
    expect(pachiConfigFromEnv({})).toEqual({})
    expect(pachiConfigFromEnv({ QCLI_HTTP_ENVELOPE: 'false' })).toEqual({ http: { envelope: false } })
    expect(pachiConfigFromEnv({ QCLI_HTTP_ENVELOPE: 'true' })).toEqual({ http: { envelope: true } })
    expect(resolvePachiConfig(pachiConfigFromEnv({ QCLI_HTTP_ENVELOPE: 'false' })).http.envelope).toBe(false)
  })
})

describe('mergePachiConfig / definePachiConfig', () => {
  const base = {
    auth: { menu: { showHome: false } },
    app: { title: 'Mia', gravatar: false, locale: 'it' },
    logo: 'img:/logo.svg'
  }
  it('l\'env non sovrascrive ciò che non imposta e non perde chiavi della base', () => {
    const cfg = definePachiConfig(base, { QCLI_APP_TITLE: 'Da env' })
    expect(cfg.app).toEqual({ title: 'Da env', gravatar: false, locale: 'it' })
    expect(cfg.auth?.menu?.showHome).toBe(false)
    expect(cfg.logo).toBe('img:/logo.svg')
  })
  it('senza variabili la base resta intatta', () => {
    expect(definePachiConfig(base, {})).toEqual(base)
  })
  it('gli override finali vincono anche sull\'env; undefined non sovrascrive; array sostituiscono', () => {
    const cfg = definePachiConfig(
      base,
      { QCLI_APP_TITLE: 'Da env' },
      { app: { title: 'Finale', locale: undefined as never }, menuItems: [{ label: 'a' }] }
    )
    expect(cfg.app?.title).toBe('Finale')
    expect(cfg.app?.locale).toBe('it')
    expect(cfg.menuItems).toEqual([{ label: 'a' }])
  })
  it('mergePachiConfig non muta gli argomenti', () => {
    const copy = structuredClone(base)
    mergePachiConfig(base, { app: { title: 'x' } })
    expect(base).toEqual(copy)
  })
})
