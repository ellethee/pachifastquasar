// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { createI18n } from 'vue-i18n'

/** AuthManager finto: `login` is driven by the tests. */
const auth = vi.hoisted(() => ({
  login: vi.fn(),
  verifyMfa: vi.fn(),
  cancelMfa: vi.fn(),
  hasPendingMfa: false,
}))
vi.mock('src/services/auth-manager/auth-manager', () => ({
  AuthManager: { getInstance: () => auth },
  getErrorCode: async () => undefined,
}))
vi.mock('src/core/config', () => ({ getPachiConfig: () => ({ app: { title: 'Demo' } }) }))

// happy-dom does not implement screen.orientation, required by Quasar's Screen/Platform plugin
if (!window.screen.orientation) {
  Object.defineProperty(window.screen, 'orientation', {
    value: { type: 'portrait-primary', addEventListener() {}, removeEventListener() {} },
    configurable: true,
  })
}

const { default: LoginPage } = await import('src/core/auth/pages/LoginPage.vue')

/** 429 error as thrown by the client, with `Retry-After` header. */
function tooMany(retryAfter?: string) {
  return {
    status: 429,
    response: { headers: { get: (n: string) => (n === 'Retry-After' ? (retryAfter ?? null) : null) } },
  }
}

/** Mounts the page with Quasar and a minimal i18n (missing keys come back as text). */
function mountLogin() {
  const i18n = createI18n({
    legacy: false,
    locale: 'it',
    missingWarn: false,
    fallbackWarn: false,
    messages: { it: { auth: { lock: { countdown: 'Locked {time}' }, login: { submit: 'Enter' } } } },
  })
  return mount(LoginPage, {
    attachTo: document.body,
    global: {
      plugins: [Quasar, i18n],
      stubs: { ToggleThemeButton: true, PachiLogo: true },
    },
  })
}

/** Fills in and submits the login form. */
async function submitLogin(w: ReturnType<typeof mountLogin>) {
  const inputs = w.findAll('input')
  await inputs[0]!.setValue('mario')
  await inputs[1]!.setValue('segreta')
  await w.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
  auth.login.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('LoginPage', () => {
  it('the button stays disabled until username and password are filled in', async () => {
    const w = mountLogin()
    const submit = w.find('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    const inputs = w.findAll('input')
    await inputs[0]!.setValue('mario')
    await inputs[1]!.setValue('x')
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('429 with Retry-After: countdown visible, button disabled, then unlocks', async () => {
    auth.login.mockRejectedValue(tooMany('90'))
    const w = mountLogin()
    await submitLogin(w)
    expect(auth.login).toHaveBeenCalledWith('mario', 'segreta')
    expect(w.text()).toContain('Locked 01:30')
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    vi.advanceTimersByTime(30_000)
    await flushPromises()
    expect(w.text()).toContain('Locked 01:00')

    vi.advanceTimersByTime(61_000)
    await flushPromises()
    expect(w.text()).not.toContain('Locked')
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('429 without Retry-After: generic message, no countdown', async () => {
    auth.login.mockRejectedValue(tooMany())
    const w = mountLogin()
    await submitLogin(w)
    expect(w.text()).not.toContain('Locked')
    expect(w.find('[role="alert"]').text()).toContain('errors.http.tooManyRequests')
  })

  it('401: invalid credentials message', async () => {
    auth.login.mockRejectedValue({ status: 401 })
    const w = mountLogin()
    await submitLogin(w)
    expect(w.find('[role="alert"]').text()).toContain('auth.login.invalidCredentials')
  })

  it('MFA required: moves to the second step with the code field', async () => {
    auth.login.mockResolvedValue({ mfaRequired: true })
    const w = mountLogin()
    await submitLogin(w)
    expect(w.text()).toContain('auth.mfa.heading')
    expect(w.find('input[autocomplete="one-time-code"]').exists()).toBe(true)
  })
})
