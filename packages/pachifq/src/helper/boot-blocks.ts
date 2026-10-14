import type { OptionalPackageKey } from './app-package.js'

/** Blocchi di codice di `src/boot/pachi.ts` per un package opzionale (vuoti se non serve iniezione). */
interface BootBlock {
  /** Nomi aggiunti all'import di `@ilpachi/pachifastquasar` (con virgola iniziale). */
  shellImports: string
  /** Righe di `import` aggiunte dopo l'import della shell. */
  imports: string
  /** Istruzioni aggiunte in coda alla funzione di boot (indentate di 2 spazi). */
  setup: string
}

/**
 * Iniezioni necessarie al funzionamento dei package opzionali.
 *
 * - `profile`: la route `/user/profile` mostra solo uno scheletro finché l'app non chiama
 *   `setPachiProfileUser` (il package non conosce l'auth dell'app).
 * - `settings` e `widgets`: nessuna iniezione, usano la factory `useAlova` che la shell fornisce con
 *   `createPachiApp` (auth, refresh del token ed errori inclusi).
 */
const BOOT_BLOCKS: Partial<Record<OptionalPackageKey, BootBlock>> = {
  profile: {
    shellImports: ', AuthManager',
    imports: "import { setPachiProfileUser } from '@ilpachi/fastquasar-profile'\n",
    setup:
      '\n' +
      '  // Profilo: la pagina legge l\'utente da qui (reattivo: lo store dell\'auth). Con auth disattivata\n' +
      '  // o senza sessione l\'utente è null e la pagina resta vuota.\n' +
      '  setPachiProfileUser(() => {\n' +
      '    const user = AuthManager.getInstance().userInfo\n' +
      '    return user ? { ...user, email: user.email ?? \'\' } : null\n' +
      '  })\n',
  },
}

/**
 * Valori dei segnaposto `{{bootShellImports}}`, `{{bootImports}}` e `{{bootSetup}}` di `src/boot/pachi.ts` per i package scelti.
 *
 * @param extras - package opzionali selezionati
 */
export function buildBootBlocks(extras: readonly OptionalPackageKey[]): { bootShellImports: string; bootImports: string; bootSetup: string } {
  const blocks = extras.map((key) => BOOT_BLOCKS[key]).filter((block): block is BootBlock => block !== undefined)
  return {
    bootShellImports: blocks.map((b) => b.shellImports).join(''),
    bootImports: blocks.map((b) => b.imports).join(''),
    bootSetup: blocks.map((b) => b.setup).join(''),
  }
}
