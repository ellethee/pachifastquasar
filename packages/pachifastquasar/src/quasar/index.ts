/**
 * Entry Node `@ilpachi/pachifastquasar/quasar`: helpers for `quasar.config.ts`. It does not import Vue nor the
 * shell components.
 */
export {
  createPachiQuasarBase,
  definePachiQuasarConfig,
  pachiQuasarConfig
} from './define-pachi-quasar-config'
export { mergeQuasarConfig } from './merge'
export type {
  PachiQuasarConfig,
  PachiQuasarContext,
  PachiQuasarOptions,
  PachiQuasarOverrides,
  PachiViteConf
} from './types'
