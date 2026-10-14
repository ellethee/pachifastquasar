import { Dialog, Notify, Quasar } from 'quasar'
import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import type { Component } from 'vue'
import { createPachiI18n, disposePachiI18n } from '@ilpachi/pachi-i18n'

// happy-dom non implementa screen.orientation, richiesto dal plugin Screen/Platform di Quasar
if (!window.screen.orientation) {
  Object.defineProperty(window.screen, 'orientation', { value: { type: 'portrait-primary', addEventListener() {}, removeEventListener() {} }, configurable: true })
}

/** Crea l'istanza i18n (it) usata dai componenti sotto test. */
export function setupI18n() {
  return createPachiI18n({ messages: { it: {} }, initialLocale: 'it' })
}

/** Rimuove l'istanza i18n globale e ripulisce il DOM tra un test e l'altro. */
export function teardown(): void {
  disposePachiI18n()
  document.body.innerHTML = ''
}

/**
 * Monta un componente con Quasar (Dialog + Notify) e pachi-i18n installati.
 *
 * @param component - componente da montare
 * @param options - opzioni di mount (props, slots, ...)
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
