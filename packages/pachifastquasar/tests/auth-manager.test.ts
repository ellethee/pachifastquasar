import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RouteMeta } from 'vue-router'

vi.mock('@ilpachi/use-alova', () => ({
  getUseAlovaInstance: () => () => ({ alova: {} }),
  STOP_PROCESSOR: Symbol('stop'),
}))
vi.mock('@ilpachi/use-alova/files', () => ({ withFiles: (api: unknown) => api }))
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })

const { AuthManager, isSameUserInfo } = await import('src/services/auth-manager/auth-manager')
const { useAuthStore } = await import('src/services/auth-manager/auth-store')
import type { IUserInfo } from 'src/services/auth-manager/types/auth-manager'

const user = (over: Partial<IUserInfo> = {}): IUserInfo => ({
  username: 'u', email: null, firstName: 'A', lastName: 'B', isActive: true,
  isStaff: false, isSuperuser: false, id: '1', permissions: [], ...over,
})

describe('AuthManager.canAccess', () => {
  let auth: ReturnType<typeof AuthManager.getInstance>

  beforeEach(() => {
    setActivePinia(createPinia())
    // il singleton è legato al pinia del test: si ricrea
    ;(AuthManager as unknown as { instance: unknown }).instance = undefined
    auth = AuthManager.getInstance()
    useAuthStore().access_token = 'tok'
  })
  const login = (u: IUserInfo) => { auth.userInfo = u }

  it('nega se non autenticato', () => {
    expect(auth.canAccess({} as RouteMeta)).toBe(false)
  })
  it('consente route senza requisiti', () => {
    login(user())
    expect(auth.canAccess({} as RouteMeta)).toBe(true)
  })
  it('il superuser bypassa tutto', () => {
    login(user({ isSuperuser: true }))
    expect(auth.canAccess({ requireSuperuser: true, permissions: ['x'] } as unknown as RouteMeta)).toBe(true)
  })
  it('requireSuperuser nega al non superuser', () => {
    login(user({ isStaff: true }))
    expect(auth.canAccess({ requireSuperuser: true } as unknown as RouteMeta)).toBe(false)
  })
  it('requireStaff', () => {
    login(user())
    expect(auth.canAccess({ requireStaff: true } as unknown as RouteMeta)).toBe(false)
    login(user({ isStaff: true }))
    expect(auth.canAccess({ requireStaff: true } as unknown as RouteMeta)).toBe(true)
  })
  it('permessi: esatti o per prefisso', () => {
    login(user({ permissions: ['users.read', 'logs'] }))
    expect(auth.canAccess({ permissions: ['users.read'] } as unknown as RouteMeta)).toBe(true)
    expect(auth.canAccess({ permissions: ['logs.view'] } as unknown as RouteMeta)).toBe(false)
    expect(auth.canAccess({ permissions: ['users'] } as unknown as RouteMeta)).toBe(true)
    expect(auth.canAccess({ permissions: ['users.read', 'admin'] } as unknown as RouteMeta)).toBe(false)
  })
  it('userInfoVersion cambia solo se i dati cambiano', () => {
    login(user())
    const v = useAuthStore().userInfoVersion
    login(user())
    expect(useAuthStore().userInfoVersion).toBe(v)
    login(user({ lastName: 'C' }))
    expect(useAuthStore().userInfoVersion).toBe(v + 1)
  })
})

describe('isSameUserInfo', () => {
  it('ignora l\'ordine dei permessi', () => {
    expect(isSameUserInfo(user({ permissions: ['a', 'b'] }), user({ permissions: ['b', 'a'] }))).toBe(true)
  })
  it('gestisce null', () => {
    expect(isSameUserInfo(null, null)).toBe(true)
    expect(isSameUserInfo(null, user())).toBe(false)
  })
})

describe('AuthManager: logout di un\'altra scheda (evento storage)', () => {
  let auth: ReturnType<typeof AuthManager.getInstance>
  let logout: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    ;(AuthManager as unknown as { instance: unknown }).instance = undefined
    auth = AuthManager.getInstance()
    logout = vi.fn(async () => undefined)
    ;(auth as unknown as { logout: unknown }).logout = logout
  })
  const fire = (key: string | null, value: string | null) =>
    (auth as unknown as { _handleStorage: (k: string | null, v: string | null) => void })._handleStorage(key, value)

  it('esce in locale se la sessione persistita viene svuotata', () => {
    useAuthStore().access_token = 'tok'
    fire('auth', null)
    expect(logout).toHaveBeenCalledWith(false)
  })
  it('esce anche se lo storage viene svuotato del tutto (key null)', () => {
    useAuthStore().refresh_token = 'r'
    fire(null, null)
    expect(logout).toHaveBeenCalledWith(false)
  })
  it('ignora altre chiavi, sessioni ancora valide e valori illeggibili', () => {
    useAuthStore().access_token = 'tok'
    fire('altro', null)
    fire('auth', JSON.stringify({ access_token: 'nuovo', refresh_token: 'r2' }))
    fire('auth', '{non json')
    expect(logout).not.toHaveBeenCalled()
  })
  it('non fa nulla se questa scheda non è autenticata', () => {
    fire('auth', null)
    expect(logout).not.toHaveBeenCalled()
  })
})
