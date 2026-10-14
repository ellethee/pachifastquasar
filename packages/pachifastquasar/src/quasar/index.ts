/**
 * Entry Node `@ilpachi/pachifastquasar/quasar`: helper per `quasar.config.ts`. Non importa Vue né i
 * componenti della shell.
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
