// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import PachiDialog from '../../src/dialog/components/PachiDialog.vue'
import PachiDialogActions from '../../src/dialog/components/PachiDialogActions.vue'
import { mountWithQuasar, teardown } from '../helpers/mount'

/** Cerca un pulsante nel DOM (il dialog e' teletrasportato nel body) per aria-label o testo. */
function btn(text: string): HTMLElement | null {
  const all = [...document.body.querySelectorAll<HTMLElement>('button')]
  return all.find(b => b.getAttribute('aria-label') === text || b.textContent?.trim() === text) ?? null
}

async function openDialog(props: Record<string, unknown>) {
  const w = mountWithQuasar(PachiDialog, { props: { title: 'Titolo', ...props }, slots: { default: '<p id="body">corpo</p>' } })
  ;(w.vm as unknown as { show: () => void }).show()
  await flushPromises()
  return w
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }) })
afterEach(() => {
  vi.useRealTimers()
  teardown()
})

describe('PachiDialogActions', () => {
  it('senza showLabels mostra solo icone con aria-label e emette i click', async () => {
    const w = mountWithQuasar(PachiDialogActions)
    const buttons = w.findAll('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.attributes('aria-label')).toBeTruthy()
    expect(buttons[0]!.text()).toBe('')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    expect(w.emitted('action:ok')).toHaveLength(1)
    expect(w.emitted('action:cancel')).toHaveLength(1)
  })

  it('con showLabels mostra le etichette e confirmDisabled disattiva il solo conferma', () => {
    const w = mountWithQuasar(PachiDialogActions, { props: { showLabels: true, confirmDisabled: true } })
    const [ok, cancel] = w.findAll('button')
    expect(ok!.text()).not.toBe('')
    expect(cancel!.text()).not.toBe('')
    expect(ok!.attributes('disabled')).toBeDefined()
    expect(cancel!.attributes('disabled')).toBeUndefined()
  })
})

describe('PachiDialog', () => {
  it('rende titolo e contenuto dopo show()', async () => {
    await openDialog({})
    expect(document.body.textContent).toContain('Titolo')
    expect(document.getElementById('body')?.textContent).toBe('corpo')
  })

  it('showActionLabels mostra le etichette sui pulsanti d\'azione', async () => {
    const w = await openDialog({ showActionLabels: true })
    const actions = w.findComponent(PachiDialogActions)
    expect(actions.exists()).toBe(true)
    expect(actions.props('showLabels')).toBe(true)
  })

  it('conferma: emette ok con awaitable e ignora il secondo click finche\' non risolto', async () => {
    const w = await openDialog({})
    const actions = w.findComponent(PachiDialogActions)
    actions.vm.$emit('action:ok')
    actions.vm.$emit('action:ok')
    await flushPromises()
    expect(w.emitted('ok')).toHaveLength(1)
    const awaitable = w.emitted('ok')![0]![0] as { onSuccess: () => void }
    awaitable.onSuccess()
    actions.vm.$emit('action:ok')
    expect(w.emitted('ok')).toHaveLength(2)
  })

  it('onError libera la guardia e notifica', async () => {
    const w = await openDialog({})
    const actions = w.findComponent(PachiDialogActions)
    actions.vm.$emit('action:ok')
    const awaitable = w.emitted('ok')![0]![0] as { onError: (e: unknown) => void }
    awaitable.onError(new Error('boom'))
    await flushPromises()
    actions.vm.$emit('action:ok')
    expect(w.emitted('ok')).toHaveLength(2)
  })

  it('senza modifiche annulla emette edit:cancel senza conferma', async () => {
    const w = await openDialog({ useEditActions: true, hasChanges: false })
    btn('Chiudi')?.click()
    await flushPromises()
    expect(w.emitted('edit:cancel')).toHaveLength(1)
  })

  it('con modifiche chiede conferma di scarto: edit:cancel solo dopo OK, una sola conferma', async () => {
    const w = await openDialog({ useEditActions: true, hasChanges: true })
    const handlers: { ok?: () => void, dismiss?: () => void } = {}
    const chain = {
      onOk(cb: () => void) { handlers.ok = cb; return chain },
      onDismiss(cb: () => void) { handlers.dismiss = cb; return chain },
    }
    const dialog = vi.fn(() => chain)
    ;(w.vm as unknown as { $q: { dialog: unknown } }).$q.dialog = dialog
    btn('Chiudi')?.click()
    btn('Chiudi')?.click()
    await flushPromises()
    expect(dialog).toHaveBeenCalledTimes(1)
    expect(w.emitted('edit:cancel')).toBeUndefined()
    handlers.ok!()
    handlers.dismiss!()
    expect(w.emitted('edit:cancel')).toHaveLength(1)
  })
})
