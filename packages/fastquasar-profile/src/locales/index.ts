import { collectLocales } from '@ilpachi/pachi-i18n'

/**
 * Package messages per language, collected from the `locales/<code>.ts` files:
 * to add a language, just add a file.
 */
export const messages = collectLocales(import.meta.glob(['./*.ts', '!./index.ts'], { eager: true, import: 'default' }))
