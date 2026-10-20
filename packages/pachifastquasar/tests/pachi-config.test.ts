import { describe, expect, it, vi } from 'vitest'
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
  it('without input returns the defaults', () => {
    expect(resolvePachiConfig()).toEqual(DEFAULT_PACHI_CONFIG)
  })
  it('merges recursively without losing the defaults', () => {
    const cfg = resolvePachiConfig({ app: { title: 'X' }, auth: { menu: { showHome: false } } })
    expect(cfg.app.title).toBe('X')
    expect(cfg.app.description).toBe(DEFAULT_PACHI_CONFIG.app.description)
    expect(cfg.auth.menu).toEqual({ showProfile: true, showSettings: true, showHome: false })
  })
  it('undefined values do not override the defaults', () => {
    expect(resolvePachiConfig({ app: { title: undefined } as never }).app.title).toBe(
      DEFAULT_PACHI_CONFIG.app.title
    )
  })
  it('does not merge components (objects with a non-plain prototype) or arrays', () => {
    class Comp {}
    const logo = new Comp() as never
    const cfg = resolvePachiConfig({ logo, menuItems: [{ label: 'a' }] })
    expect(cfg.logo).toBe(logo)
    expect(cfg.menuItems).toEqual([{ label: 'a' }])
  })
})

describe('setPachiConfig / getPachiConfig', () => {
  it('registers the resolved config', () => {
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
  it('QCLI_APP_LOGO_SIZE imposta app.logoSize; the default is 36px', () => {
    expect(resolvePachiConfig({}).app.logoSize).toBe('36px')
    expect(pachiConfigFromEnv({ QCLI_APP_LOGO_SIZE: '48px' })).toEqual({ app: { logoSize: '48px' } })
  })
  it('QCLI_APP_LOGO_OVERLAP: default false, true/false da env', () => {
    expect(resolvePachiConfig({}).app.logoOverlap).toBe(false)
    expect(pachiConfigFromEnv({ QCLI_APP_LOGO_OVERLAP: 'true' })).toEqual({ app: { logoOverlap: true } })
    expect(pachiConfigFromEnv({ QCLI_APP_LOGO_OVERLAP: 'false' })).toEqual({ app: { logoOverlap: false } })
  })
  it('contains only the variables that are set (empty = absent)', () => {
    expect(pachiConfigFromEnv({})).toEqual({})
    expect(pachiConfigFromEnv({ QCLI_APP_TITLE: '', QCLI_APP_LOCALE: '  ' })).toEqual({})
    expect(pachiConfigFromEnv({ QCLI_APP_TITLE: 'X' })).toEqual({ app: { title: 'X' } })
  })
  it('reads the QCLI_* and VITE_* variables', () => {
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
  it('QCLI_HTTP_ENVELOPE: default true, false only if set to false, absent if not set', () => {
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
  it('env does not override what it does not set and does not lose base keys', () => {
    const cfg = definePachiConfig(base, { QCLI_APP_TITLE: 'Da env' })
    expect(cfg.app).toEqual({ title: 'Da env', gravatar: false, locale: 'it' })
    expect(cfg.auth?.menu?.showHome).toBe(false)
    expect(cfg.logo).toBe('img:/logo.svg')
  })
  it('without variables the base stays intact', () => {
    expect(definePachiConfig(base, {})).toEqual(base)
  })
  it('final overrides win over env too; undefined does not override; arrays replace', () => {
    const cfg = definePachiConfig(
      base,
      { QCLI_APP_TITLE: 'Da env' },
      { app: { title: 'Finale', locale: undefined as never }, menuItems: [{ label: 'a' }] }
    )
    expect(cfg.app?.title).toBe('Finale')
    expect(cfg.app?.locale).toBe('it')
    expect(cfg.menuItems).toEqual([{ label: 'a' }])
  })
  it('mergePachiConfig does not mutate its arguments', () => {
    const copy = structuredClone(base)
    mergePachiConfig(base, { app: { title: 'x' } })
    expect(base).toEqual(copy)
  })
})

describe('auth.refreshMode', () => {
  it("default 'body'; QCLI_AUTH_REFRESH_MODE=cookie selects the cookie mode", () => {
    expect(resolvePachiConfig().auth.refreshMode).toBe('body')
    expect(pachiConfigFromEnv({ QCLI_AUTH_REFRESH_MODE: 'cookie' })).toEqual({
      auth: { refreshMode: 'cookie' }
    })
    const cfg = resolvePachiConfig(pachiConfigFromEnv({ QCLI_AUTH_REFRESH_MODE: 'cookie' }))
    expect(cfg.auth.refreshMode).toBe('cookie')
  })
  it("invalid value: falls back to 'body' with a warning", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const cfg = resolvePachiConfig(pachiConfigFromEnv({ QCLI_AUTH_REFRESH_MODE: 'header' }))
    expect(cfg.auth.refreshMode).toBe('body')
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
