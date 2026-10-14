import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Stato controllabile del finto AuthManager e della config. */
const state = vi.hoisted(() => ({
  authEnabled: true,
  authenticated: false,
  restored: false,
  landing: '/',
  canAccess: true,
  restore: vi.fn()
}))

vi.mock('src/core/config', () => ({
  getPachiConfig: () => ({ auth: { enabled: state.authEnabled } }),
  setPachiConfig: (c: unknown) => c
}))
vi.mock('src/core/menu/menu-registry', () => ({ registerPachiMenus: () => undefined }))
vi.mock('src/core/menu/collect-menus', () => ({ collectPackageMenus: () => [] }))
vi.mock('src/router/routes', () => {
  const view = { template: '<div />' }
  return {
    buildPachiRoutes: () => [
      { path: '/', component: view },
      { path: '/auth/login', component: view, meta: { noAuth: true } },
      { path: '/area', component: view, meta: { permissions: ['x'] } },
      { path: '/libera', component: view }
    ]
  }
})
vi.mock('src/services/auth-manager', () => ({
  AuthManager: {
    setRouter: () => undefined,
    getInstance: () => ({
      get isAuthenticated() { return state.authenticated },
      tryRestoreSession: state.restore,
      getDefaultLandingPath: () => state.landing,
      canAccess: () => state.canAccess
    })
  }
}))

const { createPachiRouter } = await import('src/router/create-pachi-router')

/** Naviga e restituisce il percorso finale. */
async function go(path: string, enabled = true) {
  state.authEnabled = enabled
  const router = createPachiRouter({ mode: 'memory' })
  await router.push(path)
  return router.currentRoute.value
}

describe('guardia beforeEach', () => {
  beforeEach(() => {
    state.authEnabled = true
    state.authenticated = false
    state.landing = '/'
    state.canAccess = true
    state.restore.mockReset()
    state.restore.mockImplementation(async () => state.authenticated)
  })

  it('auth disattivata: lascia passare tutto senza toccare la sessione', async () => {
    const r = await go('/area', false)
    expect(r.path).toBe('/area')
    expect(state.restore).not.toHaveBeenCalled()
  })

  it('senza sessione: rimanda al login con ?next=', async () => {
    const r = await go('/area?a=1')
    expect(r.path).toBe('/auth/login')
    expect(r.query.next).toBe('/area?a=1')
  })

  it('tenta il restore silenzioso sulle route protette e, se riesce, entra', async () => {
    state.restore.mockImplementation(async () => {
      state.authenticated = true
      return true
    })
    const r = await go('/libera')
    expect(state.restore).toHaveBeenCalledOnce()
    expect(r.path).toBe('/libera')
  })

  it('route noAuth: non tenta il restore e, da anonimo, passa', async () => {
    const r = await go('/auth/login')
    expect(state.restore).not.toHaveBeenCalled()
    expect(r.path).toBe('/auth/login')
  })

  it('route noAuth da autenticato: rimanda alla landing', async () => {
    state.authenticated = true
    state.landing = '/libera'
    const r = await go('/auth/login')
    expect(r.path).toBe('/libera')
  })

  it('autenticato ma senza permessi: rimanda alla landing', async () => {
    state.authenticated = true
    state.canAccess = false
    state.landing = '/libera'
    const r = await go('/area')
    expect(r.path).toBe('/libera')
  })

  it('senza permessi sulla landing stessa: resta lì (niente redirect infinito)', async () => {
    state.authenticated = true
    state.canAccess = false
    state.landing = '/area'
    const r = await go('/area')
    expect(r.path).toBe('/area')
  })
})
