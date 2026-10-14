export { createPachiI18n, disposePachiI18n, getPachiI18n, requirePachiI18n } from './services/i18n-instance'
export type { PachiI18n } from './services/i18n-instance'
export { usePachiI18n } from './composables/use-pachi-i18n'
export { useLocale } from './composables/use-locale'
export type { UseLocale } from './composables/use-locale'
export { pachiT } from './services/pachi-t'
export { collectLocales } from './helper/collect-locales'
export { deepMerge } from './helper/messages'
export { matchLocale } from './helper/detect-locale'
export { default as PachiLocaleSwitcher } from './components/PachiLocaleSwitcher.vue'
export type {
  CreatePachiI18nOptions,
  PachiLocaleMessages,
  PachiMessageMap,
  PachiMessages,
} from './types'
