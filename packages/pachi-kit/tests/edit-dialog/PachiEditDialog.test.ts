// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, markRaw, ref } from 'vue'
import PachiEditDialog from '../../src/edit-dialog/components/PachiEditDialog.vue'
import PachiDialogEditActions from '../../src/edit-dialog/components/PachiDialogEditActions.vue'
import { mountWithQuasar, teardown } from '../helpers/mount'

/** Shared state of the fake section, to drive it from the tests. */
const state = { value: 'a', baseline: 'a', valid: true }

/** Minimal section exposing the `ISectionExpose` interface. */
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

/** Mounts the dialog and opens it. */
async function openDialog(props: Record<string, unknown> = {}) {
  const w = mountWithQuasar(PachiEditDialog, { props: { title: 'Edit', sections, ...props } })
  const dialogRef = (w.vm as unknown as { dialogRef: { show: () => void, hide: () => void } }).dialogRef
  dialogRef.show()
  await flushPromises()
  hideSpy = vi.spyOn(dialogRef, 'hide')
  return w
}

let hideSpy: ReturnType<typeof vi.spyOn>

/** Simulates a user change to the section. */
async function touch(w: Awaited<ReturnType<typeof openDialog>>) {
  state.value = 'b'
  // forces recomputation: the fake section has no shared reactive ref
  const sec = w.findComponent(FakeSection)
  ;(sec.vm as unknown as { touch: () => void }).touch()
  await flushPromises()
}

afterEach(() => {
  state.value = 'a'; state.baseline = 'a'; state.valid = true
  teardown()
})

describe('PachiEditDialog', () => {
  it('renders title and sections; without changes the save/restore actions are hidden', async () => {
    const w = await openDialog()
    expect(document.body.textContent).toContain('Edit')
    expect(document.querySelector('.fake-section')).toBeTruthy()
    expect(w.findComponent(PachiDialogEditActions).props('hasChanges')).toBe(false)
  })

  it('with changes it emits ok with the results and closes after onSuccess (closeOnSave default)', async () => {
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

  it('closeOnSave=false: stays open and the saved state becomes the baseline', async () => {
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

  it('anti-reentry: a second save before the response is ignored', async () => {
    const w = await openDialog()
    await touch(w)
    const actions = w.findComponent(PachiDialogEditActions)
    actions.vm.$emit('save')
    actions.vm.$emit('save')
    await flushPromises()
    expect(w.emitted('ok')).toHaveLength(1)
  })

  it('failed validation: does not emit ok and releases the guard', async () => {
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

  it('onError releases the guard (new save possible)', async () => {
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

  it('restore resets the section', async () => {
    const w = await openDialog()
    await touch(w)
    w.findComponent(PachiDialogEditActions).vm.$emit('restore')
    await flushPromises()
    expect(state.value).toBe('a')
    expect(w.findComponent(PachiDialogEditActions).props('hasChanges')).toBe(false)
  })

  it('with avoidHideWithChanges and changes, closing asks for discard confirmation', async () => {
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
