import { collectLocales } from '../helper/collect-locales'

/**
 * Package messages per locale, collected from the `locales/<code>.ts` files:
 * to add a locale just add a file.
 */
export const messages = collectLocales(import.meta.glob(['./*.ts', '!./index.ts'], { eager: true, import: 'default' }))
