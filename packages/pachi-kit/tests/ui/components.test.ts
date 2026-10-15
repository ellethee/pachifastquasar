// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import PachiConfirmDialog from '../../src/ui/PachiConfirmDialog.vue'
import PachiDatePicker from '../../src/ui/PachiDatePicker.vue'
import { mountWithQuasar, teardown } from '../helpers/mount'

afterEach(teardown)

describe('PachiDatePicker', () => {
  it('shows the model in the input and emits update:modelValue on typing', async () => {
    const w = mountWithQuasar(PachiDatePicker, { props: { modelValue: '2026-01-02 10:30' } })
    const input = w.find('input')
    expect((input.element as HTMLInputElement).value).toBe('2026-01-02 10:30')
    await input.setValue('2026-03-04 08:00')
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['2026-03-04 08:00'])
  })

  it('by default the calendar/clock buttons are active', () => {
    const w = mountWithQuasar(PachiDatePicker)
    const btns = w.findAll('button')
    expect(btns).toHaveLength(2)
    expect(btns.every(b => b.attributes('disabled') === undefined && b.attributes('aria-disabled') === undefined)).toBe(true)
  })

  it('readonly: read-only input and disabled buttons', () => {
    const w = mountWithQuasar(PachiDatePicker, { props: { readonly: true } })
    expect(w.find('input').attributes('readonly')).toBeDefined()
    const btns = w.findAll('button')
    expect(btns.every(b => b.attributes('disabled') !== undefined)).toBe(true)
  })

  it('disable: disabled input and disabled buttons', () => {
    const w = mountWithQuasar(PachiDatePicker, { props: { disable: true } })
    expect(w.find('input').attributes('disabled')).toBeDefined()
    expect(w.findAll('button').every(b => b.attributes('disabled') !== undefined)).toBe(true)
  })
})

describe('PachiConfirmDialog (type-to-confirm)', () => {
  /** Mounts and opens the dialog; returns the wrapper. */
  async function open(props: Record<string, unknown> = {}) {
    const w = mountWithQuasar(PachiConfirmDialog, { props: { title: 'Delete X', description: 'Irreversible', ...props } })
    ;(w.vm as unknown as { dialogRef: { show: () => void } }).dialogRef.show()
    await flushPromises()
    return w
  }
  const input = () => document.body.querySelector<HTMLInputElement>('.pachi-confirm-dialog__input input')!
  const submit = () => document.body.querySelector<HTMLButtonElement>('.pachi-confirm-dialog__submit')!
  /** Types in the input as the user would. */
  async function type(text: string) {
    input().value = text
    input().dispatchEvent(new Event('input'))
    await flushPromises()
  }

  it('the button stays disabled until the exact word is typed', async () => {
    const w = await open()
    expect(document.body.textContent).toContain('Delete X')
    expect(submit().disabled).toBe(true)
    await type('elimina')
    expect(submit().disabled).toBe(true)
    await type('ELIMINA')
    expect(submit().disabled).toBe(false)
    submit().click()
    await flushPromises()
    expect(w.emitted('ok')).toHaveLength(1)
  })

  it('with a custom word it shows and requires it; surrounding spaces ignored', async () => {
    const w = await open({ confirmWord: 'prod-db' })
    expect(document.body.querySelector('.pachi-confirm-dialog__confirm-word')?.textContent).toBe('prod-db')
    await type('ELIMINA')
    expect(submit().disabled).toBe(true)
    await type('  prod-db ')
    expect(submit().disabled).toBe(false)
    expect(w.emitted('ok')).toBeUndefined()
  })

  it('Enter with a wrong word does not confirm; Cancel does not emit ok', async () => {
    const w = await open()
    await type('no')
    input().dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13 }))
    await flushPromises()
    expect(w.emitted('ok')).toBeUndefined()
    document.body.querySelector<HTMLButtonElement>('.pachi-confirm-dialog__btn:not(.pachi-confirm-dialog__submit)')!.click()
    await flushPromises()
    expect(w.emitted('ok')).toBeUndefined()
  })

  it('custom tone and submitLabel', async () => {
    await open({ tone: 'info', submitLabel: 'Proceed' })
    expect(document.body.querySelector('.pachi-confirm-dialog--info')).toBeTruthy()
    expect(submit().textContent).toContain('Proceed')
  })
})
