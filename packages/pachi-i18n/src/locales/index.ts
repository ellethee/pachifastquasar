import { collectLocales } from '../helper/collect-locales'

/**
 * Messaggi del package per lingua, raccolti dai file `locales/<codice>.ts`:
 * per aggiungere una lingua basta aggiungere un file.
 */
export const messages = collectLocales(import.meta.glob(['./*.ts', '!./index.ts'], { eager: true, import: 'default' }))
