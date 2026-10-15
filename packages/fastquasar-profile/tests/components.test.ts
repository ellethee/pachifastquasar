// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { setPachiProfileHttp } from '../src/helpers/http'
import type { IPachiProfileHttp } from '../src/helpers/http'
import PachiMfaPanel from '../src/components/PachiMfaPanel.vue'
import PachiProfileEditForm from '../src/components/PachiProfileEditForm.vue'
import { mountWithQuasar, teardown } from './helpers/mount'

/** Fake HTTP client: each method is a configurable `vi.fn`. */
interface IMockHttp extends IPachiProfileHttp {
  Get: ReturnType<typeof vi.fn>
  Post: ReturnType<typeof vi.fn>
  Patch: ReturnType<typeof vi.fn>
}

/** Creates the fake client and registers it as the package client. */
function installHttp(): IMockHttp {
  const http = { Get: vi.fn(), Post: vi.fn(), Patch: vi.fn() } as IMockHttp
  setPachiProfileHttp(() => http)
  return http
}

/** HTTP error as thrown by the client (status, body and headers). */
function httpError(status: number, detail: unknown[] = [], headers: Record<string, string> = {}) {
  return { status, body: { detail }, headers }
}

/** Finds a button by text. */
function button(w: VueWrapper, text: string) {
  const b = w.findAll('button').find(x => x.text().includes(text))
  if (!b) throw new Error(`button not found: ${text}`)
  return b
}

/** Sets an input value and submits the form containing it. */
async function fillAndSubmit(w: VueWrapper, selector: string, value: string) {
  await w.find(selector).setValue(value)
  await w.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  // flushPromises uses setTimeout/microtask: only interval timers and Date are faked
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
})
afterEach(() => {
  vi.useRealTimers()
  setPachiProfileHttp(null)
  teardown()
})

describe('PachiMfaPanel (two-step SMS)', () => {
  /** Mounts the panel with only SMS offered and MFA disabled. */
  async function mountSms(http: IMockHttp) {
    http.Get.mockResolvedValue({ enabled: false, method: null })
    const w = mountWithQuasar(PachiMfaPanel, { props: { methods: ['sms'] } })
    await flushPromises()
    return w
  }

  it('stays hidden if /mfa/status does not respond', async () => {
    const http = installHttp()
    http.Get.mockRejectedValue(httpError(404))
    const w = mountWithQuasar(PachiMfaPanel)
    await flushPromises()
    expect(w.find('section').exists()).toBe(false)
  })

  it('number without leading +: validation error and no request', async () => {
    const http = installHttp()
    const w = await mountSms(http)
    await button(w, 'SMS').trigger('click')
    await fillAndSubmit(w, 'input[type="tel"]', '333 1234567')
    expect(w.text()).toContain('Numero non valido')
    expect(http.Post).not.toHaveBeenCalled()
  })

  it('sends the normalized number, moves to the code step and blocks resending for 30 s', async () => {
    const http = installHttp()
    http.Post.mockResolvedValue({ confirm_required: true })
    const w = await mountSms(http)
    await button(w, 'SMS').trigger('click')
    await fillAndSubmit(w, 'input[type="tel"]', '+39 333 123-4567')
    expect(http.Post).toHaveBeenCalledWith('/mfa/sms/setup', { phone_number: '+393331234567' }, expect.anything())
    expect(w.text()).toContain('Conferma il codice ricevuto per SMS')
    const resend = button(w, 'Invia di nuovo il codice')
    expect(resend.attributes('disabled')).toBeDefined()
    expect(resend.text()).toContain('00:30')
    // resend ignored during the pause
    await resend.trigger('click')
    expect(http.Post).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(29_000)
    await flushPromises()
    expect(button(w, 'Invia di nuovo il codice').attributes('disabled')).toBeDefined()
    vi.advanceTimersByTime(1_500)
    await flushPromises()
    const after = button(w, 'Invia di nuovo il codice')
    expect(after.attributes('disabled')).toBeUndefined()
    expect(after.text()).not.toContain('(')
  })

  it('code confirmation: invalid code blocked, valid one sends /mfa/sms/confirm and shows the backup codes', async () => {
    const http = installHttp()
    http.Post.mockResolvedValueOnce({ confirm_required: true })
    const w = await mountSms(http)
    await button(w, 'SMS').trigger('click')
    await fillAndSubmit(w, 'input[type="tel"]', '+393331234567')

    await fillAndSubmit(w, 'input[inputmode="numeric"]', '12')
    expect(http.Post).toHaveBeenCalledTimes(1)

    http.Post.mockResolvedValueOnce({ backup_codes: ['AAAA-1111', 'BBBB-2222'] })
    http.Get.mockResolvedValue({ enabled: true, method: 'sms' })
    await fillAndSubmit(w, 'input[inputmode="numeric"]', '123 456')
    expect(http.Post).toHaveBeenLastCalledWith('/mfa/sms/confirm', { code: '123456' }, expect.anything())
    expect(w.text()).toContain('AAAA-1111')
    expect(w.text()).toContain('BBBB-2222')
  })

  it('429 on send: pause with Retry-After on the resend button', async () => {
    const http = installHttp()
    http.Post.mockRejectedValue(httpError(429, [{ code: 'auth.rate_limited' }], { 'retry-after': '45' }))
    const w = await mountSms(http)
    await button(w, 'SMS').trigger('click')
    await fillAndSubmit(w, 'input[type="tel"]', '+393331234567')
    // stays on the number step: submit is disabled for the duration of Retry-After
    expect(button(w, 'Invia il codice').attributes('disabled')).toBeDefined()
    vi.advanceTimersByTime(46_000)
    await flushPromises()
    expect(button(w, 'Invia il codice').attributes('disabled')).toBeUndefined()
  })

  it('expired setup (noSmsSetup) goes back to the number step', async () => {
    const http = installHttp()
    http.Post.mockResolvedValueOnce({ confirm_required: true })
    const w = await mountSms(http)
    await button(w, 'SMS').trigger('click')
    await fillAndSubmit(w, 'input[type="tel"]', '+393331234567')
    http.Post.mockRejectedValueOnce(httpError(400, [{ code: 'mfa.no_sms_setup' }]))
    await fillAndSubmit(w, 'input[inputmode="numeric"]', '123456')
    expect(w.text()).toContain('La richiesta è scaduta')
    expect(w.find('input[type="tel"]').exists()).toBe(true)
  })
})

describe('PachiProfileEditForm', () => {
  const user = { id: 1, username: 'mario', email: 'm@x.it', firstName: 'Mario', lastName: 'Rossi' }

  it('without changes emits cancel and does not call the backend', async () => {
    const http = installHttp()
    const w = mountWithQuasar(PachiProfileEditForm, { props: { user } })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(http.Patch).not.toHaveBeenCalled()
    expect(w.emitted('cancel')).toHaveLength(1)
  })

  it('PATCH with only the changed fields and emits updated with the response', async () => {
    const http = installHttp()
    http.Patch.mockResolvedValue({ username: 'mario', email: 'm@x.it', first_name: 'Marco', last_name: 'Rossi', id: 1 })
    const w = mountWithQuasar(PachiProfileEditForm, { props: { user } })
    await w.findAll('input')[0]!.setValue('Marco')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(http.Patch).toHaveBeenCalledTimes(1)
    const [url, body] = http.Patch.mock.calls[0]!
    expect(url).toBe('/auth/user')
    expect(JSON.stringify(body)).toContain('Marco')
    expect(JSON.stringify(body)).not.toContain('Rossi')
    const updated = w.emitted('updated')![0]![0] as { firstName: string }
    expect(updated.firstName).toBe('Marco')
  })

  it('email change without password: error on the password field and no request', async () => {
    const http = installHttp()
    const w = mountWithQuasar(PachiProfileEditForm, { props: { user } })
    await w.find('input[type="email"]').setValue('nuova@x.it')
    expect(w.find('input[type="password"]').exists()).toBe(true)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(http.Patch).not.toHaveBeenCalled()
    expect(w.text()).toContain('Inserisci la password attuale')
  })

  it('backend errors assigned to the right field (wrong password, email already used)', async () => {
    const http = installHttp()
    const w = mountWithQuasar(PachiProfileEditForm, { props: { user } })
    await w.find('input[type="email"]').setValue('nuova@x.it')
    await w.find('input[type="password"]').setValue('sbagliata')
    http.Patch.mockRejectedValueOnce(httpError(403, [{ code: 'auth.password_incorrect' }]))
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('La password attuale non è corretta')
    expect(w.emitted('updated')).toBeUndefined()

    await w.find('input[type="password"]').setValue('giusta')
    http.Patch.mockRejectedValueOnce(httpError(409, [{ code: 'user.email_exists' }]))
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('già usato da un altro account')
    expect(w.text()).not.toContain('La password attuale non è corretta')
  })

  it('429 with Retry-After: warning with countdown and save disabled', async () => {
    const http = installHttp()
    http.Patch.mockRejectedValueOnce(httpError(429, [], { 'Retry-After': '90' }))
    const w = mountWithQuasar(PachiProfileEditForm, { props: { user } })
    await w.findAll('input')[0]!.setValue('Marco')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('01:30')
    expect(button(w, 'Salva').attributes('disabled')).toBeDefined()
    vi.advanceTimersByTime(91_000)
    await flushPromises()
    expect(w.text()).not.toContain('riprova tra')
    expect(button(w, 'Salva').attributes('disabled')).toBeUndefined()
  })
})
