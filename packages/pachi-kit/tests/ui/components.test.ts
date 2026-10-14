// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import PachiConfirmDialog from '../../src/ui/PachiConfirmDialog.vue'
import PachiDatePicker from '../../src/ui/PachiDatePicker.vue'
import { mountWithQuasar, teardown } from '../helpers/mount'

afterEach(teardown)

describe('PachiDatePicker', () => {
  it('mostra il modello nell\'input ed emette update:modelValue alla digitazione', async () => {
    const w = mountWithQuasar(PachiDatePicker, { props: { modelValue: '2026-01-02 10:30' } })
    const input = w.find('input')
    expect((input.element as HTMLInputElement).value).toBe('2026-01-02 10:30')
    await input.setValue('2026-03-04 08:00')
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['2026-03-04 08:00'])
  })

  it('di default i pulsanti calendario/orologio sono attivi', () => {
    const w = mountWithQuasar(PachiDatePicker)
    const btns = w.findAll('button')
    expect(btns).toHaveLength(2)
    expect(btns.every(b => b.attributes('disabled') === undefined && b.attributes('aria-disabled') === undefined)).toBe(true)
  })

  it('readonly: input in sola lettura e pulsanti disabilitati', () => {
    const w = mountWithQuasar(PachiDatePicker, { props: { readonly: true } })
    expect(w.find('input').attributes('readonly')).toBeDefined()
    const btns = w.findAll('button')
    expect(btns.every(b => b.attributes('disabled') !== undefined)).toBe(true)
  })

  it('disable: input disabilitato e pulsanti disabilitati', () => {
    const w = mountWithQuasar(PachiDatePicker, { props: { disable: true } })
    expect(w.find('input').attributes('disabled')).toBeDefined()
    expect(w.findAll('button').every(b => b.attributes('disabled') !== undefined)).toBe(true)
  })
})

describe('PachiConfirmDialog (type-to-confirm)', () => {
  /** Monta e apre il dialog; ritorna il wrapper. */
  async function open(props: Record<string, unknown> = {}) {
    const w = mountWithQuasar(PachiConfirmDialog, { props: { title: 'Elimina X', description: 'Irreversibile', ...props } })
    ;(w.vm as unknown as { dialogRef: { show: () => void } }).dialogRef.show()
    await flushPromises()
    return w
  }
  const input = () => document.body.querySelector<HTMLInputElement>('.pachi-confirm-dialog__input input')!
  const submit = () => document.body.querySelector<HTMLButtonElement>('.pachi-confirm-dialog__submit')!
  /** Digita nell'input come farebbe l'utente. */
  async function type(text: string) {
    input().value = text
    input().dispatchEvent(new Event('input'))
    await flushPromises()
  }

  it('il pulsante resta disattivato finche\' non si digita la parola esatta', async () => {
    const w = await open()
    expect(document.body.textContent).toContain('Elimina X')
    expect(submit().disabled).toBe(true)
    await type('elimina')
    expect(submit().disabled).toBe(true)
    await type('ELIMINA')
    expect(submit().disabled).toBe(false)
    submit().click()
    await flushPromises()
    expect(w.emitted('ok')).toHaveLength(1)
  })

  it('con parola personalizzata la mostra e la richiede; spazi ai bordi ignorati', async () => {
    const w = await open({ confirmWord: 'prod-db' })
    expect(document.body.querySelector('.pachi-confirm-dialog__confirm-word')?.textContent).toBe('prod-db')
    await type('ELIMINA')
    expect(submit().disabled).toBe(true)
    await type('  prod-db ')
    expect(submit().disabled).toBe(false)
    expect(w.emitted('ok')).toBeUndefined()
  })

  it('Invio con parola errata non conferma; Annulla non emette ok', async () => {
    const w = await open()
    await type('no')
    input().dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13 }))
    await flushPromises()
    expect(w.emitted('ok')).toBeUndefined()
    document.body.querySelector<HTMLButtonElement>('.pachi-confirm-dialog__btn:not(.pachi-confirm-dialog__submit)')!.click()
    await flushPromises()
    expect(w.emitted('ok')).toBeUndefined()
  })

  it('tone e submitLabel personalizzati', async () => {
    await open({ tone: 'info', submitLabel: 'Procedi' })
    expect(document.body.querySelector('.pachi-confirm-dialog--info')).toBeTruthy()
    expect(submit().textContent).toContain('Procedi')
  })
})
