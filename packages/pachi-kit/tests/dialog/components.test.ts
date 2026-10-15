// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import PachiDialog from '../../src/dialog/components/PachiDialog.vue'
import PachiDialogActions from '../../src/dialog/components/PachiDialogActions.vue'
import { mountWithQuasar, teardown } from '../helpers/mount'

/** Finds a button in the DOM (the dialog is teleported to the body) by aria-label or text. */
function btn(text: string): HTMLElement | null {
  const all = [...document.body.querySelectorAll<HTMLElement>('button')]
  return all.find(b => b.getAttribute('aria-label') === text || b.textContent?.trim() === text) ?? null
}

async function openDialog(props: Record<string, unknown>) {
  const w = mountWithQuasar(PachiDialog, { props: { title: 'Title', ...props }, slots: { default: '<p id="body">body</p>' } })
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
  it('without showLabels it shows only icons with aria-label and emits the clicks', async () => {
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

  it('with showLabels it shows the labels and confirmDisabled disables only the confirm button', () => {
    const w = mountWithQuasar(PachiDialogActions, { props: { showLabels: true, confirmDisabled: true } })
    const [ok, cancel] = w.findAll('button')
    expect(ok!.text()).not.toBe('')
    expect(cancel!.text()).not.toBe('')
    expect(ok!.attributes('disabled')).toBeDefined()
    expect(cancel!.attributes('disabled')).toBeUndefined()
  })
})

describe('PachiDialog', () => {
  it('renders title and content after show()', async () => {
    await openDialog({})
    expect(document.body.textContent).toContain('Title')
    expect(document.getElementById('body')?.textContent).toBe('body')
  })

  it('showActionLabels shows the labels on the action buttons', async () => {
    const w = await openDialog({ showActionLabels: true })
    const actions = w.findComponent(PachiDialogActions)
    expect(actions.exists()).toBe(true)
    expect(actions.props('showLabels')).toBe(true)
  })

  it('confirm: emits ok with awaitable and ignores the second click until resolved', async () => {
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

  it('onError releases the guard and notifies', async () => {
    const w = await openDialog({})
    const actions = w.findComponent(PachiDialogActions)
    actions.vm.$emit('action:ok')
    const awaitable = w.emitted('ok')![0]![0] as { onError: (e: unknown) => void }
    awaitable.onError(new Error('boom'))
    await flushPromises()
    actions.vm.$emit('action:ok')
    expect(w.emitted('ok')).toHaveLength(2)
  })

  it('without changes cancel emits edit:cancel without confirmation', async () => {
    const w = await openDialog({ useEditActions: true, hasChanges: false })
    btn('Chiudi')?.click()
    await flushPromises()
    expect(w.emitted('edit:cancel')).toHaveLength(1)
  })

  it('with changes it asks for discard confirmation: edit:cancel only after OK, a single confirmation', async () => {
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
