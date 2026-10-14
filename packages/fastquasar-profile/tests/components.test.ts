// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { setPachiProfileHttp } from '../src/helpers/http'
import type { IPachiProfileHttp } from '../src/helpers/http'
import PachiMfaPanel from '../src/components/PachiMfaPanel.vue'
import PachiProfileEditForm from '../src/components/PachiProfileEditForm.vue'
import { mountWithQuasar, teardown } from './helpers/mount'

/** Client HTTP finto: ogni metodo e' un `vi.fn` configurabile. */
interface IMockHttp extends IPachiProfileHttp {
  Get: ReturnType<typeof vi.fn>
  Post: ReturnType<typeof vi.fn>
  Patch: ReturnType<typeof vi.fn>
}

/** Crea il client finto e lo registra come client del package. */
function installHttp(): IMockHttp {
  const http = { Get: vi.fn(), Post: vi.fn(), Patch: vi.fn() } as IMockHttp
  setPachiProfileHttp(() => http)
  return http
}

/** Errore HTTP come lo lancia il client (status, corpo e header). */
function httpError(status: number, detail: unknown[] = [], headers: Record<string, string> = {}) {
  return { status, body: { detail }, headers }
}

/** Trova un pulsante per testo. */
function button(w: VueWrapper, text: string) {
  const b = w.findAll('button').find(x => x.text().includes(text))
  if (!b) throw new Error(`pulsante non trovato: ${text}`)
  return b
}

/** Imposta il valore di un input e invia il form che lo contiene. */
async function fillAndSubmit(w: VueWrapper, selector: string, value: string) {
  await w.find(selector).setValue(value)
  await w.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  // flushPromises usa setTimeout/microtask: si falsano solo timer a intervallo e Date
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
})
afterEach(() => {
  vi.useRealTimers()
  setPachiProfileHttp(null)
  teardown()
})

describe('PachiMfaPanel (SMS in due passi)', () => {
  /** Monta il pannello con solo SMS offerto, MFA disattiva. */
  async function mountSms(http: IMockHttp) {
    http.Get.mockResolvedValue({ enabled: false, method: null })
    const w = mountWithQuasar(PachiMfaPanel, { props: { methods: ['sms'] } })
    await flushPromises()
    return w
  }

  it('resta nascosto se /mfa/status non risponde', async () => {
    const http = installHttp()
    http.Get.mockRejectedValue(httpError(404))
    const w = mountWithQuasar(PachiMfaPanel)
    await flushPromises()
    expect(w.find('section').exists()).toBe(false)
  })

  it('numero senza + iniziale: errore di validazione e nessuna richiesta', async () => {
    const http = installHttp()
    const w = await mountSms(http)
    await button(w, 'SMS').trigger('click')
    await fillAndSubmit(w, 'input[type="tel"]', '333 1234567')
    expect(w.text()).toContain('Numero non valido')
    expect(http.Post).not.toHaveBeenCalled()
  })

  it('invia il numero normalizzato, passa al codice e blocca il reinvio per 30 s', async () => {
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
    // rinvio ignorato durante la pausa
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

  it('conferma del codice: codice non valido bloccato, valido invia /mfa/sms/confirm e mostra i backup code', async () => {
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

  it('429 sull\'invio: pausa con Retry-After sul pulsante di reinvio', async () => {
    const http = installHttp()
    http.Post.mockRejectedValue(httpError(429, [{ code: 'auth.rate_limited' }], { 'retry-after': '45' }))
    const w = await mountSms(http)
    await button(w, 'SMS').trigger('click')
    await fillAndSubmit(w, 'input[type="tel"]', '+393331234567')
    // resta sul passo del numero: il submit e' disattivato per la durata di Retry-After
    expect(button(w, 'Invia il codice').attributes('disabled')).toBeDefined()
    vi.advanceTimersByTime(46_000)
    await flushPromises()
    expect(button(w, 'Invia il codice').attributes('disabled')).toBeUndefined()
  })

  it('setup scaduto (noSmsSetup) riporta al passo del numero', async () => {
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

  it('senza modifiche emette cancel e non chiama il backend', async () => {
    const http = installHttp()
    const w = mountWithQuasar(PachiProfileEditForm, { props: { user } })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(http.Patch).not.toHaveBeenCalled()
    expect(w.emitted('cancel')).toHaveLength(1)
  })

  it('PATCH con i soli campi cambiati ed emette updated con la risposta', async () => {
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

  it('cambio email senza password: errore sul campo password e nessuna richiesta', async () => {
    const http = installHttp()
    const w = mountWithQuasar(PachiProfileEditForm, { props: { user } })
    await w.find('input[type="email"]').setValue('nuova@x.it')
    expect(w.find('input[type="password"]').exists()).toBe(true)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(http.Patch).not.toHaveBeenCalled()
    expect(w.text()).toContain('Inserisci la password attuale')
  })

  it('errori del backend assegnati al campo giusto (password errata, email gia\' usata)', async () => {
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

  it('429 con Retry-After: avviso con countdown e salvataggio disattivato', async () => {
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
