import { Dialog, Notify, Quasar } from 'quasar'
import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import type { Component } from 'vue'
import { createPachiI18n, disposePachiI18n } from '@ilpachi/pachi-i18n'

// happy-dom does not implement screen.orientation, required by Quasar's Screen/Platform plugin
if (!window.screen.orientation) {
  Object.defineProperty(window.screen, 'orientation', { value: { type: 'portrait-primary', addEventListener() {}, removeEventListener() {} }, configurable: true })
}

/** Creates the i18n instance (it) used by the components under test. */
export function setupI18n() {
  return createPachiI18n({ messages: { it: {} }, initialLocale: 'it' })
}

/** Removes the global i18n instance and cleans the DOM between tests. */
export function teardown(): void {
  disposePachiI18n()
  document.body.innerHTML = ''
}

/**
 * Mounts a component with Quasar (Dialog + Notify) and pachi-i18n installed.
 *
 * @param component - component to mount
 * @param options - mount options (props, slots, ...)
 */
export function mountWithQuasar(component: Component, options: ComponentMountingOptions<any> = {}) {
  const i18n = setupI18n()
  return mount(component, {
    attachTo: document.body,
    ...options,
    global: {
      ...options.global,
      plugins: [[Quasar, { plugins: { Dialog, Notify } }], i18n],
    },
  })
}
