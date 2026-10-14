// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, markRaw, ref } from 'vue'
import PachiEditDialog from '../../src/edit-dialog/components/PachiEditDialog.vue'
import PachiDialogEditActions from '../../src/edit-dialog/components/PachiDialogEditActions.vue'
import { mountWithQuasar, teardown } from '../helpers/mount'

/** Stato condiviso della sezione finta, per pilotarla dai test. */
const state = { value: 'a', baseline: 'a', valid: true }

/** Sezione minima che espone l'interfaccia `ISectionExpose`. */
const FakeSection = defineComponent({
  setup(_p, { expose }) {
    const tick = ref(0)
    expose({
      hasChanges: () => { void tick.value; return state.value !== state.baseline },
      getResults: () => ({ value: state.value }),
      validate: () => state.valid,
      reset: () => { state.value = state.baseline; tick.value++ },
      commit: () => { state.baseline = state.value; tick.value++ },
      touch: () => { state.value = 'b'; tick.value++ },
    })
    return () => h('div', { class: 'fake-section' }, 'sezione')
  },
})

const sections = [{ key: 'f', title: 'F', component: markRaw(FakeSection) }]

/** Monta il dialog e lo apre. */
async function openDialog(props: Record<string, unknown> = {}) {
  const w = mountWithQuasar(PachiEditDialog, { props: { title: 'Modifica', sections, ...props } })
  const dialogRef = (w.vm as unknown as { dialogRef: { show: () => void, hide: () => void } }).dialogRef
  dialogRef.show()
  await flushPromises()
  hideSpy = vi.spyOn(dialogRef, 'hide')
  return w
}

let hideSpy: ReturnType<typeof vi.spyOn>

/** Simula una modifica dell'utente alla sezione. */
async function touch(w: Awaited<ReturnType<typeof openDialog>>) {
  state.value = 'b'
  // forza il ricalcolo: la sezione finta non ha un ref reattivo condiviso
  const sec = w.findComponent(FakeSection)
  ;(sec.vm as unknown as { touch: () => void }).touch()
  await flushPromises()
}

afterEach(() => {
  state.value = 'a'; state.baseline = 'a'; state.valid = true
  teardown()
})

describe('PachiEditDialog', () => {
  it('rende titolo e sezioni; senza modifiche le azioni salva/ripristina sono nascoste', async () => {
    const w = await openDialog()
    expect(document.body.textContent).toContain('Modifica')
    expect(document.querySelector('.fake-section')).toBeTruthy()
    expect(w.findComponent(PachiDialogEditActions).props('hasChanges')).toBe(false)
  })

  it('con modifiche emette ok con i risultati e chiude dopo onSuccess (closeOnSave default)', async () => {
    const w = await openDialog()
    await touch(w)
    const actions = w.findComponent(PachiDialogEditActions)
    expect(actions.props('hasChanges')).toBe(true)
    actions.vm.$emit('save')
    await flushPromises()
    const [payload] = w.emitted('ok')![0] as [{ data: { sections: Record<string, unknown> }, onSuccess: () => void }]
    expect(payload.data.sections).toMatchObject({ f: { value: 'b' } })
    payload.onSuccess()
    await flushPromises()
    expect(state.baseline).toBe('b')
    expect(hideSpy).toHaveBeenCalledTimes(1)
  })

  it('closeOnSave=false: resta aperto e il salvato diventa baseline', async () => {
    const w = await openDialog({ closeOnSave: false })
    await touch(w)
    w.findComponent(PachiDialogEditActions).vm.$emit('save')
    await flushPromises()
    const [payload] = w.emitted('ok')![0] as [{ onSuccess: () => void }]
    payload.onSuccess()
    await flushPromises()
    expect(hideSpy).not.toHaveBeenCalled()
    expect(w.findComponent(PachiDialogEditActions).props('hasChanges')).toBe(false)
    expect(document.querySelector('.pachi-dialog-footer__saved')).toBeTruthy()
  })

  it('anti-rientro: un secondo salvataggio prima della risposta e\' ignorato', async () => {
    const w = await openDialog()
    await touch(w)
    const actions = w.findComponent(PachiDialogEditActions)
    actions.vm.$emit('save')
    actions.vm.$emit('save')
    await flushPromises()
    expect(w.emitted('ok')).toHaveLength(1)
  })

  it('validazione fallita: non emette ok e libera la guardia', async () => {
    const w = await openDialog()
    await touch(w)
    state.valid = false
    const actions = w.findComponent(PachiDialogEditActions)
    actions.vm.$emit('save')
    await flushPromises()
    expect(w.emitted('ok')).toBeUndefined()
    state.valid = true
    actions.vm.$emit('save')
    await flushPromises()
    expect(w.emitted('ok')).toHaveLength(1)
  })

  it('onError libera la guardia (nuovo salvataggio possibile)', async () => {
    const w = await openDialog()
    await touch(w)
    const actions = w.findComponent(PachiDialogEditActions)
    actions.vm.$emit('save')
    await flushPromises()
    const [payload] = w.emitted('ok')![0] as [{ onError: (e: unknown) => void }]
    payload.onError(new Error('boom'))
    actions.vm.$emit('save')
    await flushPromises()
    expect(w.emitted('ok')).toHaveLength(2)
  })

  it('restore ripristina la sezione', async () => {
    const w = await openDialog()
    await touch(w)
    w.findComponent(PachiDialogEditActions).vm.$emit('restore')
    await flushPromises()
    expect(state.value).toBe('a')
    expect(w.findComponent(PachiDialogEditActions).props('hasChanges')).toBe(false)
  })

  it('con avoidHideWithChanges e modifiche, chiudere chiede conferma di scarto', async () => {
    const w = await openDialog({ avoidHideWithChanges: true })
    await touch(w)
    const dialog = vi.fn(() => ({ onOk: () => ({ onDismiss: () => ({}) }) }))
    ;(w.vm as unknown as { $q: { dialog: unknown } }).$q.dialog = dialog
    w.findComponent(PachiDialogEditActions).vm.$emit('cancel')
    await flushPromises()
    expect(dialog).toHaveBeenCalledTimes(1)
    expect(hideSpy).not.toHaveBeenCalled()
  })
})
